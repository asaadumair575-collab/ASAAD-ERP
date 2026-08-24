"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EcomDispatchButton({ id, trackingNumber }: { id: number; trackingNumber: string | null }) {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    if (!tracking.trim()) return;
    setSaving(true);
    await fetch("/api/ecom/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, trackingNumber: tracking.trim() }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (trackingNumber) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          Dispatched
        </span>
        <span className="text-xs text-gray-400 font-mono">{trackingNumber}</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5"><path d="M2 8h9M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        Dispatch
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        type="text"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Tracking #"
        className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-black"
      />
      <button
        onClick={save}
        disabled={saving || !tracking.trim()}
        className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
      >
        {saving ? "…" : "Save"}
      </button>
      <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}
