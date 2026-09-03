"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";

type Recent = { trackingNumber: string; weight: number; time: string; photo: string; matched: boolean };

// Pulls the most plausible weight reading (e.g. "1.24", "0.85") out of OCR
// text from a scale display photo. Falls back to empty if nothing looks right.
function extractWeight(text: string): string {
  const matches = text.match(/\d+\.\d{1,3}|\d{1,4}/g);
  if (!matches) return "";
  const numbers = matches.map((m) => parseFloat(m)).filter((n) => n > 0 && n < 50);
  if (numbers.length === 0) return "";
  // Prefer a decimal-looking reading (scales usually show e.g. 1.245 kg)
  const decimalMatch = matches.find((m) => m.includes("."));
  return decimalMatch ? decimalMatch : String(numbers[0]);
}

export default function WeightVerifyScanner() {
  const [stage, setStage] = useState<"scan" | "weight" | "saving">("scan");
  const [weight, setWeight] = useState("");
  const [ocrRunning, setOcrRunning] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const pendingCn = useRef("");

  useEffect(() => {
    if (stage === "weight") weightInputRef.current?.select();
  }, [stage]);

  function startPhotoCapture(cn: string) {
    pendingCn.current = cn;
    fileInputRef.current?.click();
  }

  const onBarcodeScanned = useCallback((text: string) => {
    setCameraOpen(false);
    startPhotoCapture(text);
  }, []);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const photo = reader.result as string;
      setPendingPhoto(photo);
      setStage("weight");
      setWeight("");
      setOcrRunning(true);
      try {
        const { default: Tesseract } = await import("tesseract.js");
        const { data } = await Tesseract.recognize(photo, "eng", {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        setWeight(extractWeight(data.text));
      } catch {
        // OCR failed — employee types it in instead
      } finally {
        setOcrRunning(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onWeightKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const w = parseFloat(weight);
    if (!w || w <= 0 || !pendingPhoto) return;

    setStage("saving");
    setMessage(null);
    const cn = pendingCn.current;

    try {
      const res = await fetch("/api/ecom/weight-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: cn, weight: w, photo: pendingPhoto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setRecent((r) => [
        { trackingNumber: cn, weight: w, time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }), photo: pendingPhoto, matched: !!data.orderMatched },
        ...r,
      ].slice(0, 8));
      setMessage({
        type: "ok",
        text: data.orderMatched ? `Packed — ${cn} · ${w} kg` : `Saved — ${cn} · ${w} kg (no matching order found)`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setWeight("");
      setPendingPhoto(null);
      setStage("scan");
    }
  }

  const totalWeight = recent.reduce((s, r) => s + r.weight, 0);

  return (
    <div className="space-y-4">
      <BarcodeScannerModal open={cameraOpen} onClose={() => setCameraOpen(false)} onScanned={onBarcodeScanned} />

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        {stage !== "weight" ? (
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={stage === "saving"}
            className="w-full bg-[#16202E] text-[#BFD732] rounded-xl py-6 flex flex-col items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-8 h-8">
              <path d="M3 6.5V4.5A1.5 1.5 0 0 1 4.5 3h2M13.5 3h2A1.5 1.5 0 0 1 17 4.5v2M17 13.5v2a1.5 1.5 0 0 1-1.5 1.5h-2M6.5 17h-2A1.5 1.5 0 0 1 3 15.5v-2M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-base font-bold">Scan Parcel Barcode</span>
          </button>
        ) : (
          <>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {pendingCn.current} — Weight (kg){ocrRunning && " · reading scale…"}
            </label>
            <input
              ref={weightInputRef}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={onWeightKeyDown}
              disabled={ocrRunning}
              placeholder={ocrRunning ? "Reading weight from photo…" : "Confirm weight, then press Enter"}
              className="mt-2 w-full border border-[#BFD732] rounded-xl px-4 py-3 text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#BFD732] disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1.5">Auto-read from the scale photo — check it's correct, then press Enter.</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          className="hidden"
        />
        {stage === "saving" && <p className="text-xs text-gray-400 mt-2">Saving…</p>}
        {message && (
          <p className={`text-sm mt-2 font-medium ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
            {message.type === "ok" ? "✓" : "✕"} {message.text}
          </p>
        )}
      </div>

      {recent.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recently Verified ({recent.length})</p>
            <p className="text-xs font-semibold text-[#16202E]">Total: {totalWeight.toFixed(2)} kg</p>
          </div>
          <div className="divide-y divide-gray-100">
            {recent.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.photo} alt={r.trackingNumber} className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-gray-800 truncate">{r.trackingNumber}</p>
                  <p className="text-xs text-gray-400">{r.time}{!r.matched && " · no matching order"}</p>
                </div>
                <p className="text-sm font-bold tabular-nums text-[#16202E]">{r.weight} kg</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
