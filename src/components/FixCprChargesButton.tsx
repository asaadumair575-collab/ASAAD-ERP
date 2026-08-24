"use client";

import { useState } from "react";

export default function FixCprChargesButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<{ id: number; cod: number; net: number; oldCharge: number; newCharge: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFix() {
    if (!confirm("Sab CPR-settled orders ke courier charges theek kar dein?")) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/admin/fix-cpr-charges", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResults(data.results);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold text-green-700">✓ {results.length} orders fix ho gaye</p>
        <div className="space-y-1">
          {results.map((r) => (
            <p key={r.id} className="text-xs text-green-600 font-mono">
              R-{String(r.id).padStart(3, "0")} — old: Rs {r.oldCharge} → new: Rs {r.newCharge}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-2">
      <p className="text-xs text-yellow-700 font-medium">Purane CPR orders ke galat courier charges theek karein</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={handleFix}
        disabled={status === "loading"}
        className="bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
      >
        {status === "loading" ? "Fix ho raha hai…" : "Fix Existing CPR Charges"}
      </button>
    </div>
  );
}
