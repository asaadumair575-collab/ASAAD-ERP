"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EcomDispatchButton({ id, trackingNumber }: { id: number; trackingNumber: string | null }) {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (trackingNumber) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        Dispatched
      </span>
    );
  }

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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
      >
        Dispatch
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="text"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="Tracking #"
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-black"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs font-medium px-2 py-1 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? "…" : "Save"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-black px-1">✕</button>
    </div>
  );
}
