"use client";

import { useEffect, useRef, useState } from "react";

type Recent = { trackingNumber: string; weight: number; time: string; photo: string; matched: boolean };

export default function WeightVerifyScanner() {
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<"scan" | "weight" | "saving">("scan");
  const [weight, setWeight] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const pendingCn = useRef("");

  useEffect(() => {
    if (stage === "weight") weightInputRef.current?.focus();
    if (stage === "scan") scanInputRef.current?.focus();
  }, [stage]);

  function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const cn = value.trim();
    if (!cn) return;
    pendingCn.current = cn;
    // Open the camera immediately — must be called synchronously in this
    // trusted event handler for the browser to allow it without a click.
    fileInputRef.current?.click();
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPendingPhoto(reader.result as string);
      setStage("weight");
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
      setValue("");
      setWeight("");
      setPendingPhoto(null);
      setStage("scan");
    }
  }

  const totalWeight = recent.reduce((s, r) => s + r.weight, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        {stage !== "weight" ? (
          <>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scan Parcel</label>
            <input
              ref={scanInputRef}
              type="text"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onScanKeyDown}
              disabled={stage === "saving"}
              placeholder="Scan or type tracking number, then press Enter"
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#BFD732] disabled:opacity-50"
            />
          </>
        ) : (
          <>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight (kg) — {pendingCn.current}</label>
            <input
              ref={weightInputRef}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={onWeightKeyDown}
              placeholder="Enter weight from scale, then press Enter"
              className="mt-2 w-full border border-[#BFD732] rounded-xl px-4 py-3 text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#BFD732]"
            />
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
