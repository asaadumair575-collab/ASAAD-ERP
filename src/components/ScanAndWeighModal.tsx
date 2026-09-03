"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

type Recent = { trackingNumber: string; grams: number; time: string; photo: string; matched: boolean };
type Stage = "barcode" | "verifying" | "position" | "confirm" | "saving";

const QR_HINTS = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]]]);

// Pulls the most plausible weight reading out of OCR text — digits and an
// optional decimal point only (the crop already excludes model-name text).
function extractWeight(text: string): string {
  const matches = text.match(/\d+\.\d{1,2}|\d{1,5}/g);
  if (!matches) return "";
  const decimalMatch = matches.find((m) => m.includes("."));
  return decimalMatch ?? matches[0] ?? "";
}

// The QR on a PostEx airway bill may encode the tracking number directly, or
// a URL/JSON blob containing it — pull out the longest digit run either way.
function extractTrackingNumber(raw: string): string {
  const text = raw.trim();
  if (/^\d{8,}$/.test(text)) return text;
  const digitRuns = text.match(/\d{8,}/g);
  if (digitRuns) return digitRuns.sort((a, b) => b.length - a.length)[0];
  return text;
}

export default function ScanAndWeighModal() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("barcode");
  const [error, setError] = useState<string | null>(null);
  const [grams, setGrams] = useState("");
  const [ocrRunning, setOcrRunning] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [verifiedCustomer, setVerifiedCustomer] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const pendingCn = useRef("");

  const stopStream = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startBarcodeStage = useCallback(() => {
    setError(null);
    setStage("barcode");
    const reader = new BrowserMultiFormatReader(QR_HINTS);
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result) => {
          if (cancelled || !result) return;
          const raw = result.getText().trim();
          if (!raw) return;
          const text = extractTrackingNumber(raw);
          cancelled = true;
          pendingCn.current = text;
          stopStream();
          verifyAndProceed(text);
        }
      )
      .then((controls) => {
        controlsRef.current = controls;
        streamRef.current = (videoRef.current?.srcObject as MediaStream) ?? null;
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not access camera"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopStream]);

  const verifyAndProceed = useCallback(async (cn: string) => {
    setError(null);
    setStage("verifying");
    try {
      const res = await fetch(`/api/ecom/order-by-tracking?tracking=${encodeURIComponent(cn)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify order");
      if (!data.found) {
        setMessage({ type: "error", text: `Not found in system — ${cn}` });
        setTimeout(() => setMessage(null), 2500);
        startBarcodeStage();
        return;
      }
      setVerifiedCustomer(data.order?.customerName ?? null);
      startPositionStage();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Could not verify order" });
      setTimeout(() => setMessage(null), 2500);
      startBarcodeStage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPositionStage = useCallback(() => {
    setError(null);
    setStage("position");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not access camera"));
  }, []);

  useEffect(() => {
    if (!open) return;
    const cleanup = startBarcodeStage();
    return () => {
      cleanup?.();
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (stage === "confirm") weightInputRef.current?.select();
  }, [stage]);

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    // Crop to the on-screen guide box — a centered rect matching what's drawn below.
    const boxWidthFrac = 0.7;
    const boxHeightFrac = 0.22;
    const sw = video.videoWidth * boxWidthFrac;
    const sh = video.videoHeight * boxHeightFrac;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    const cropDataUrl = canvas.toDataURL("image/jpeg", 0.9);

    // Also keep a full-frame photo for the saved record.
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = video.videoWidth;
    fullCanvas.height = video.videoHeight;
    fullCanvas.getContext("2d")?.drawImage(video, 0, 0);
    const fullDataUrl = fullCanvas.toDataURL("image/jpeg", 0.85);

    stopStream();
    setCapturedPhoto(fullDataUrl);
    setStage("confirm");
    setGrams("");
    setOcrRunning(true);

    try {
      const { default: Tesseract } = await import("tesseract.js");
      const { data } = await Tesseract.recognize(cropDataUrl, "eng", {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      setGrams(extractWeight(data.text));
    } catch {
      // OCR failed — employee types it in instead
    } finally {
      setOcrRunning(false);
    }
  }

  async function onWeightKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const g = parseFloat(grams);
    if (!g || g <= 0 || !capturedPhoto) return;

    setStage("saving");
    setMessage(null);
    const cn = pendingCn.current;

    try {
      const res = await fetch("/api/ecom/weight-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: cn, weight: g / 1000, photo: capturedPhoto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setRecent((r) => [
        { trackingNumber: cn, grams: g, time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }), photo: capturedPhoto, matched: !!data.orderMatched },
        ...r,
      ].slice(0, 8));
      setMessage({
        type: "ok",
        text: data.orderMatched ? `Packed — ${cn} · ${g} g` : `Saved — ${cn} · ${g} g (no matching order found)`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setCapturedPhoto(null);
      startBarcodeStage();
    }
  }

  function close() {
    stopStream();
    setOpen(false);
    setMessage(null);
  }

  const totalGrams = recent.reduce((s, r) => s + r.grams, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#232F42] transition-colors flex items-center gap-1.5"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <path d="M3 6.5V4.5A1.5 1.5 0 0 1 4.5 3h2M13.5 3h2A1.5 1.5 0 0 1 17 4.5v2M17 13.5v2a1.5 1.5 0 0 1-1.5 1.5h-2M6.5 17h-2A1.5 1.5 0 0 1 3 15.5v-2M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Scan &amp; Weigh
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black">
          {/* Live camera — used for both barcode scan and scale positioning */}
          <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover ${stage === "confirm" || stage === "saving" ? "hidden" : ""}`} muted playsInline />

          {stage === "verifying" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <div className="w-10 h-10 border-4 border-white/20 border-t-[#BFD732] rounded-full animate-spin" />
              <p className="text-sm text-white font-medium">Checking {pendingCn.current} in system…</p>
            </div>
          )}

          {stage === "barcode" && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 max-w-[70%] aspect-square border-2 border-[#BFD732] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
              <div className="absolute bottom-0 inset-x-0 px-4 py-5 text-center">
                <p className="text-sm text-white/80">Hold the airway bill&apos;s QR code inside the frame</p>
              </div>
            </>
          )}

          {stage === "position" && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] aspect-[3.2/1] border-2 border-[#BFD732] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
              </div>
              <div className="absolute bottom-0 inset-x-0 px-4 py-6 flex flex-col items-center gap-3">
                <p className="text-sm text-white/80">Place the parcel on the scale — fit the weight display inside the frame</p>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-[#BFD732] active:scale-95 transition-transform"
                  aria-label="Capture"
                />
              </div>
            </>
          )}

          {(stage === "confirm" || stage === "saving") && capturedPhoto && (
            <div className="h-full overflow-y-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedPhoto} alt="Scale" className="w-full max-h-[45vh] object-cover" />
              <div className="p-5 bg-gray-50 min-h-[40vh]">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {pendingCn.current} — Weight (grams){ocrRunning && " · reading scale…"}
                </label>
                <input
                  ref={weightInputRef}
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  onKeyDown={onWeightKeyDown}
                  disabled={ocrRunning || stage === "saving"}
                  placeholder={ocrRunning ? "Reading weight from photo…" : "Confirm weight (g), then press Enter"}
                  className="mt-2 w-full border border-[#BFD732] rounded-xl px-4 py-3 text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#BFD732] disabled:opacity-50 bg-white"
                />
                <p className="text-xs text-gray-400 mt-1.5">Auto-read from the scale photo — check it&apos;s correct, then press Enter.</p>
                {stage === "saving" && <p className="text-xs text-gray-400 mt-2">Saving…</p>}
              </div>
            </div>
          )}

          <div className="absolute top-0 inset-x-0 px-4 py-3.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
            <p className="text-sm font-semibold text-white">
              {stage === "barcode"
                ? "Scan QR Code"
                : stage === "verifying"
                  ? "Verifying Order"
                  : stage === "position"
                    ? verifiedCustomer
                      ? `Weigh Parcel — ${verifiedCustomer}`
                      : "Weigh Parcel"
                    : "Confirm Weight"}
            </p>
            <button type="button" onClick={close} className="text-white p-1.5 rounded-lg hover:bg-white/10" aria-label="Close">
              <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="absolute bottom-0 inset-x-0 px-4 py-5 text-center">
              <p className="text-sm text-red-300 bg-black/50 inline-block px-4 py-2 rounded-lg">{error}</p>
            </div>
          )}

          {message && (
            <div className="absolute top-14 inset-x-0 px-4 text-center">
              <p className={`text-sm font-medium inline-block px-4 py-2 rounded-lg ${message.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                {message.type === "ok" ? "✓" : "✕"} {message.text}
              </p>
            </div>
          )}

          {recent.length > 0 && stage === "barcode" && (
            <div className="absolute bottom-14 inset-x-0 px-4">
              <div className="bg-black/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-white/80 max-w-sm mx-auto">
                <span>{recent.length} verified today</span>
                <span className="font-semibold">Total: {(totalGrams / 1000).toFixed(2)} kg</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
