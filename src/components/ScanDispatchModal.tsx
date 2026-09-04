"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

type Stage = "scan" | "verifying" | "position" | "confirm" | "saving";

const QR_HINTS = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]]]);

function extractWeight(text: string): string {
  const matches = text.match(/\d+\.\d{1,2}|\d{1,5}/g);
  if (!matches) return "";
  const decimalMatch = matches.find((m) => m.includes("."));
  return decimalMatch ?? matches[0] ?? "";
}

function extractSheetId(raw: string): number | null {
  const text = raw.trim();
  const m = text.match(/DIS:(\d+)/i) ?? text.match(/^(\d+)$/);
  return m ? Number(m[1]) : null;
}

function preprocessForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const scale = 3;
  const out = document.createElement("canvas");
  out.width = source.width * scale;
  out.height = source.height * scale;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = true;
  octx.drawImage(source, 0, 0, out.width, out.height);

  const imgData = octx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  let min = 255, max = 0;
  const gray = new Uint8ClampedArray(d.length / 4);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[p] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(max - min, 1);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const stretched = ((gray[p] - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = stretched;
  }
  octx.putImageData(imgData, 0, 0);
  return out;
}

export default function ScanDispatchModal() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("scan");
  const [error, setError] = useState<string | null>(null);
  const [grams, setGrams] = useState("");
  const [ocrRunning, setOcrRunning] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [verifiedSheet, setVerifiedSheet] = useState<{ sheetNumber: string; totalParcels: number; totalWeight: number } | null>(null);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const pendingSheetId = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startScanStage = useCallback(() => {
    setError(null);
    setStage("scan");
    const reader = new BrowserMultiFormatReader(QR_HINTS);
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result) => {
          if (cancelled || !result) return;
          const raw = result.getText().trim();
          const sheetId = extractSheetId(raw);
          if (!sheetId) return;
          cancelled = true;
          pendingSheetId.current = sheetId;
          stopStream();
          verifyAndProceed(sheetId);
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

  const verifyAndProceed = useCallback(async (sheetId: number) => {
    setError(null);
    setStage("verifying");
    try {
      const res = await fetch(`/api/ecom/dispatch-sheets/${sheetId}`);
      const data = await res.json();
      if (!data.found) {
        setMessage({ type: "error", text: "Dispatch sheet not found in system" });
        setTimeout(() => setMessage(null), 2500);
        startScanStage();
        return;
      }
      if (data.sheet.dispatchedAt) {
        setMessage({ type: "error", text: `${data.sheet.sheetNumber} already dispatched` });
        setTimeout(() => setMessage(null), 2500);
        startScanStage();
        return;
      }
      setVerifiedSheet({ sheetNumber: data.sheet.sheetNumber, totalParcels: data.sheet.totalParcels, totalWeight: data.sheet.totalWeight });
      startPositionStage();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Could not verify sheet" });
      setTimeout(() => setMessage(null), 2500);
      startScanStage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQrGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader(QR_HINTS);
      const result = await reader.decodeFromImageUrl(url);
      const sheetId = extractSheetId(result.getText().trim());
      if (!sheetId) {
        setMessage({ type: "error", text: "No dispatch sheet QR code found in that photo" });
        setTimeout(() => setMessage(null), 2500);
        return;
      }
      pendingSheetId.current = sheetId;
      stopStream();
      verifyAndProceed(sheetId);
    } catch {
      setMessage({ type: "error", text: "No QR code found in that photo" });
      setTimeout(() => setMessage(null), 2500);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

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
    const cleanup = startScanStage();
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

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = video.videoWidth;
    fullCanvas.height = video.videoHeight;
    fullCanvas.getContext("2d")?.drawImage(video, 0, 0);
    const fullDataUrl = fullCanvas.toDataURL("image/jpeg", 0.85);

    stopStream();
    await processWeightImage(canvas, fullDataUrl);
  }

  // Shared by both the live camera capture and a gallery upload — crops a
  // guide-box-sized region for OCR and stores the full photo either way.
  async function processWeightImage(cropSourceCanvas: HTMLCanvasElement, fullDataUrl: string) {
    const ocrCanvas = preprocessForOcr(cropSourceCanvas);
    const cropDataUrl = ocrCanvas.toDataURL("image/png");

    setCapturedPhoto(fullDataUrl);
    setStage("confirm");
    setGrams("");
    setOcrRunning(true);

    try {
      const { default: Tesseract, PSM } = await import("tesseract.js");
      const worker = await Tesseract.createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789.",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      const { data } = await worker.recognize(cropDataUrl);
      await worker.terminate();
      setGrams(extractWeight(data.text));
    } catch {
      // OCR failed — employee types it in instead
    } finally {
      setOcrRunning(false);
    }
  }

  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      const boxWidthFrac = 0.7;
      const boxHeightFrac = 0.22;
      const sw = img.naturalWidth * boxWidthFrac;
      const sh = img.naturalHeight * boxHeightFrac;
      const sx = (img.naturalWidth - sw) / 2;
      const sy = (img.naturalHeight - sh) / 2;

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = sw;
      cropCanvas.height = sh;
      cropCanvas.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = img.naturalWidth;
      fullCanvas.height = img.naturalHeight;
      fullCanvas.getContext("2d")?.drawImage(img, 0, 0);

      stopStream();
      await processWeightImage(cropCanvas, fullCanvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = URL.createObjectURL(file);
  }

  async function saveDispatch() {
    const g = parseFloat(grams);
    if (!g || g <= 0 || !pendingSheetId.current) return;

    setStage("saving");
    setMessage(null);
    const sheetId = pendingSheetId.current;

    try {
      const res = await fetch(`/api/ecom/dispatch-sheets/${sheetId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: g / 1000, photo: capturedPhoto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setMessage({
        type: data.mismatch ? "error" : "ok",
        text: data.mismatch
          ? `${data.sheetNumber} dispatched — but scanned ${g} g vs expected ${(data.expectedWeight * 1000).toFixed(0)} g. Check parcels!`
          : `${data.sheetNumber} dispatched — ${g} g scanned`,
      });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setCapturedPhoto(null);
      setVerifiedSheet(null);
      startScanStage();
    }
  }

  function close() {
    stopStream();
    setOpen(false);
    setMessage(null);
  }

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
        Scan &amp; Dispatch
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black">
          <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover ${stage === "confirm" || stage === "saving" ? "hidden" : ""}`} muted playsInline />

          {stage === "verifying" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <div className="w-10 h-10 border-4 border-white/20 border-t-[#BFD732] rounded-full animate-spin" />
              <p className="text-sm text-white font-medium">Checking sheet in system…</p>
            </div>
          )}

          {stage === "scan" && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 max-w-[70%] aspect-square border-2 border-[#BFD732] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
              <div className="absolute bottom-0 inset-x-0 px-4 py-5 flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-white/80">Hold the dispatch sheet&apos;s QR code inside the frame</p>
                <label className="text-xs font-medium text-white/70 underline decoration-dotted cursor-pointer active:text-white">
                  Or upload a photo of the QR code
                  <input type="file" accept="image/*" className="hidden" onChange={handleQrGalleryUpload} />
                </label>
              </div>
            </>
          )}

          {stage === "position" && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] aspect-[3.2/1] border-2 border-[#BFD732] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
              </div>
              <div className="absolute bottom-0 inset-x-0 px-4 py-6 flex flex-col items-center gap-3">
                <p className="text-sm text-white/80">Place all parcels on the scale — fit the weight display inside the frame</p>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-[#BFD732] active:scale-95 transition-transform"
                  aria-label="Capture"
                />
                <label className="text-xs font-medium text-white/70 underline decoration-dotted cursor-pointer active:text-white">
                  Or upload a photo from gallery
                  <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                </label>
              </div>
            </>
          )}

          {(stage === "confirm" || stage === "saving") && capturedPhoto && (
            <div className="h-full overflow-y-auto bg-[#0B0F16]">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capturedPhoto} alt="Scale" className="w-full max-h-[42vh] object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B0F16] to-transparent" />
              </div>
              <div className="px-5 pt-1 pb-8 -mt-6 relative">
                <div className="bg-white rounded-2xl shadow-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dispatch Sheet</p>
                      <p className="text-sm font-mono font-semibold text-[#16202E]">
                        {verifiedSheet?.sheetNumber} — {verifiedSheet?.totalParcels} parcels
                      </p>
                      {verifiedSheet && verifiedSheet.totalWeight > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">Expected ~{verifiedSheet.totalWeight.toFixed(2)} kg</p>
                      )}
                    </div>
                    {ocrRunning && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-[#16202E] rounded-full animate-spin" />
                        reading scale
                      </span>
                    )}
                  </div>

                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Combined Weight (grams)</label>
                  <div className="relative mt-1.5">
                    <input
                      ref={weightInputRef}
                      type="number"
                      step="1"
                      inputMode="decimal"
                      value={grams}
                      onChange={(e) => setGrams(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveDispatch()}
                      disabled={ocrRunning || stage === "saving"}
                      placeholder={ocrRunning ? "…" : "0"}
                      className="w-full border-2 border-gray-100 focus:border-[#BFD732] rounded-2xl pl-4 pr-14 py-4 text-4xl font-bold tabular-nums text-[#16202E] focus:outline-none disabled:opacity-40 bg-gray-50 focus:bg-white transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">g</span>
                  </div>

                  <p className="text-xs text-gray-400 mt-2.5 flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 shrink-0"><path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.4"/><path d="M10 13v-4M10 7h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    Auto-read from the scale photo — confirm it&apos;s correct, then tap Dispatch.
                  </p>

                  <button
                    type="button"
                    onClick={saveDispatch}
                    disabled={ocrRunning || stage === "saving" || !parseFloat(grams || "0")}
                    className="mt-4 w-full bg-[#16202E] text-[#BFD732] font-semibold text-base py-3.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    {stage === "saving" ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#BFD732]/30 border-t-[#BFD732] rounded-full animate-spin" />
                        Dispatching…
                      </>
                    ) : (
                      "Dispatch"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-0 inset-x-0 px-4 py-3.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
            <p className="text-sm font-semibold text-white">
              {stage === "scan"
                ? "Scan Dispatch Sheet"
                : stage === "verifying"
                  ? "Verifying Sheet"
                  : stage === "position"
                    ? verifiedSheet
                      ? `Weigh Parcels — ${verifiedSheet.sheetNumber}`
                      : "Weigh Parcels"
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
            <div className="absolute top-16 inset-x-0 px-4 text-center z-10">
              <p className={`text-sm font-semibold inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl shadow-lg ${message.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${message.type === "ok" ? "bg-emerald-500" : "bg-red-500"}`}>
                  {message.type === "ok" ? "✓" : "✕"}
                </span>
                {message.text}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
