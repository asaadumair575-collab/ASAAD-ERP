"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "CALL_NOT_PICKED", label: "📵 Call Not Picked", active: "bg-yellow-100 text-yellow-700 border-yellow-300", inactive: "text-gray-500 border-gray-200 hover:border-yellow-300 hover:text-yellow-600" },
  { value: "NUMBER_OFF",      label: "🔕 Number Off",      active: "bg-orange-100 text-orange-700 border-orange-300", inactive: "text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600" },
  { value: "CANCELLED",       label: "❌ Cancel",           active: "bg-red-100 text-red-600 border-red-300",          inactive: "text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-600" },
  { value: "CONFIRMED",       label: "✅ Confirm Order",    active: "bg-green-100 text-green-700 border-green-300",    inactive: "text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-600" },
];

export default function DraftStatusSelect({ id, initial }: { id: number; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handle(newVal: string) {
    const next = newVal === value ? "" : newVal;
    setValue(next);
    setSaving(true);
    await fetch("/api/ecom/draft-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, draftStatus: next }),
    });
    setSaving(false);
    if (next === "CONFIRMED") router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400 font-medium">Status:</span>
      {STATUSES.map((s) => {
        const isActive = value === s.value;
        return (
          <button
            key={s.value}
            onClick={() => handle(s.value)}
            disabled={saving}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-all ${isActive ? s.active : s.inactive} disabled:opacity-50`}
          >
            {s.label}
          </button>
        );
      })}
      {saving && <span className="text-xs text-gray-400">saving…</span>}
    </div>
  );
}
