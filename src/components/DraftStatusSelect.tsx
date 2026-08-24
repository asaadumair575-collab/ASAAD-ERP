"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "CALL_NOT_PICKED", label: "📵 Call Not Picked" },
  { value: "NUMBER_OFF",      label: "🔕 Number Off" },
  { value: "CANCELLED",       label: "❌ Cancel Order" },
  { value: "CONFIRMED",       label: "✅ Confirm Order" },
];

// Full pill-button row (used in old card view — not used now)
// Compact = small dropdown (used in table row on hover)
export default function DraftStatusSelect({
  id,
  initial,
  compact = false,
}: {
  id: number;
  initial: string | null;
  compact?: boolean;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handle(newVal: string) {
    if (saving) return;
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

  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => handle(e.target.value)}
        disabled={saving}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
      >
        <option value="">— Set status —</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    );
  }

  // Full pill buttons (kept for backwards compat)
  const PILL_COLORS: Record<string, { active: string; inactive: string }> = {
    CALL_NOT_PICKED: { active: "bg-yellow-100 text-yellow-700 border-yellow-300", inactive: "text-gray-500 border-gray-200 hover:border-yellow-300 hover:text-yellow-600" },
    NUMBER_OFF:      { active: "bg-orange-100 text-orange-700 border-orange-300", inactive: "text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600" },
    CANCELLED:       { active: "bg-red-100 text-red-600 border-red-300",          inactive: "text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-600" },
    CONFIRMED:       { active: "bg-green-100 text-green-700 border-green-300",    inactive: "text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-600" },
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400 font-medium">Status:</span>
      {STATUSES.map((s) => {
        const isActive = value === s.value;
        const colors = PILL_COLORS[s.value];
        return (
          <button
            key={s.value}
            onClick={() => handle(isActive ? "" : s.value)}
            disabled={saving}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-all ${isActive ? colors.active : colors.inactive} disabled:opacity-50`}
          >
            {s.label}
          </button>
        );
      })}
      {saving && <span className="text-xs text-gray-400">saving…</span>}
    </div>
  );
}
