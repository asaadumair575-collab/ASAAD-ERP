"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "CALL_NOT_PICKED", label: "Call Not Picked", emoji: "📵" },
  { value: "NUMBER_OFF",      label: "Number Off",      emoji: "🔕" },
  { value: "CANCELLED",       label: "Cancel Order",    emoji: "❌" },
  { value: "CONFIRMED",       label: "Confirm Order",   emoji: "✅" },
];

export default function DraftStatusSelect({
  id,
  initial,
  compact = false,
}: {
  id: number;
  initial: string | null;
  compact?: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function confirm() {
    if (!pending || saving) return;
    setSaving(true);
    await fetch("/api/ecom/draft-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, draftStatus: pending }),
    });
    setSaving(false);
    setPending(null);
    router.refresh();
  }

  function cancel() {
    setPending(null);
  }

  const selectedMeta = STATUSES.find((s) => s.value === pending);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={pending ?? ""}
          onChange={(e) => setPending(e.target.value || null)}
          disabled={saving}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
        >
          <option value="">— Set status —</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
          ))}
        </select>

        {pending && (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-150">
            <button
              onClick={confirm}
              disabled={saving}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "…" : "Confirm"}
            </button>
            <button
              onClick={cancel}
              disabled={saving}
              className="text-xs px-2 py-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
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
        const isActive = pending === s.value || (!pending && initial === s.value);
        const colors = PILL_COLORS[s.value];
        return (
          <button
            key={s.value}
            onClick={() => setPending(isActive ? null : s.value)}
            disabled={saving}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-all ${isActive ? colors.active : colors.inactive} disabled:opacity-50`}
          >
            {s.emoji} {s.label}
          </button>
        );
      })}
      {pending && (
        <button onClick={confirm} disabled={saving} className="text-xs font-semibold px-3 py-1 rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : `Save`}
        </button>
      )}
    </div>
  );
}
