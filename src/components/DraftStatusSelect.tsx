"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "", label: "— Select Status —" },
  { value: "CONFIRMED", label: "✅ Confirmed" },
  { value: "CALL_NOT_PICKED", label: "📵 Call Not Picked" },
  { value: "NUMBER_OFF", label: "🔕 Number Off" },
  { value: "CANCELLED", label: "❌ Cancel Order" },
];

const colors: Record<string, string> = {
  CONFIRMED: "bg-green-50 border-green-200 text-green-700",
  CALL_NOT_PICKED: "bg-yellow-50 border-yellow-200 text-yellow-700",
  NUMBER_OFF: "bg-orange-50 border-orange-200 text-orange-700",
  CANCELLED: "bg-red-50 border-red-200 text-red-700",
};

export default function DraftStatusSelect({ id, initial }: { id: number; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handle(newVal: string) {
    setValue(newVal);
    setSaving(true);
    await fetch("/api/ecom/draft-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, draftStatus: newVal }),
    });
    setSaving(false);
    if (newVal === "CONFIRMED") router.refresh();
  }

  const colorClass = value ? colors[value] ?? "bg-gray-50 border-gray-200 text-gray-700" : "bg-gray-50 border-gray-200 text-gray-400";

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value}
        onChange={(e) => handle(e.target.value)}
        disabled={saving}
        className={`text-xs font-medium px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-black transition-colors ${colorClass}`}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-gray-400">saving…</span>}
    </div>
  );
}
