"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "CALL_NOT_PICKED", label: "Call Not Picked", emoji: "📵", active: "bg-yellow-100 text-yellow-700 ring-yellow-400 border-yellow-300", inactive: "bg-white text-gray-600 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50" },
  { value: "NUMBER_OFF",      label: "Number Off",      emoji: "🔕", active: "bg-orange-100 text-orange-700 ring-orange-400 border-orange-300", inactive: "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50" },
  { value: "CANCELLED",       label: "Cancel Order",    emoji: "❌", active: "bg-red-100 text-red-600 ring-red-400 border-red-300",           inactive: "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:bg-red-50" },
  { value: "CONFIRMED",       label: "Confirm Order",   emoji: "✅", active: "bg-green-100 text-green-700 ring-green-400 border-green-300",   inactive: "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50" },
];

const STATUS_META: Record<string, { label: string; dotColor: string; badgeColor: string }> = {
  CALL_NOT_PICKED: { label: "Call Not Picked", dotColor: "bg-yellow-400",  badgeColor: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  NUMBER_OFF:      { label: "Number Off",      dotColor: "bg-orange-400",  badgeColor: "bg-orange-50 text-orange-700 border-orange-200" },
  CANCELLED:       { label: "Cancelled",        dotColor: "bg-red-400",     badgeColor: "bg-red-50 text-red-600 border-red-200" },
  CONFIRMED:       { label: "Confirmed",        dotColor: "bg-green-500",   badgeColor: "bg-green-50 text-green-700 border-green-200" },
};

type StatusLog = { id: number; status: string; createdAt: Date };

export default function DraftStatusModal({
  id,
  initial,
  logs = [],
}: {
  id: number;
  initial: string | null;
  logs?: StatusLog[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function openModal() {
    setSelected(null);
    setOpen(true);
  }

  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    await fetch("/api/ecom/draft-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, draftStatus: selected }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  const currentMeta = initial ? STATUS_META[initial] : null;

  return (
    <>
      {/* Trigger badge */}
      <button onClick={openModal} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors hover:opacity-80 cursor-pointer ${currentMeta ? currentMeta.badgeColor : "border-green-200 bg-green-50 text-green-700"}`}>
        {currentMeta ? (
          <>
            <span className={`w-1.5 h-1.5 rounded-full ${currentMeta.dotColor}`} />
            {currentMeta.label}
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            New
          </>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Update Status</h2>
                <p className="text-xs text-gray-400 mt-0.5">Select the current call outcome</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-600 transition-colors mt-0.5">
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Status grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {STATUSES.map((s) => {
                const isActive = selected === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setSelected(isActive ? null : s.value)}
                    className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border-2 font-medium text-sm transition-all
                      ${isActive ? `${s.active} ring-2 ring-offset-1` : s.inactive}`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span className="text-center leading-tight">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Save */}
            <button
              onClick={save}
              disabled={!selected || saving}
              className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : selected ? `Set — ${STATUSES.find(s => s.value === selected)?.label}` : "Select a status"}
            </button>

            {/* Timeline */}
            {logs.length > 0 && (
              <div className="pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">History</p>
                <ol className="relative border-l border-gray-200 space-y-3 ml-2">
                  {logs.map((log) => {
                    const meta = STATUS_META[log.status];
                    const d = new Date(log.createdAt);
                    const dateStr = d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
                    const timeStr = d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true });
                    return (
                      <li key={log.id} className="ml-4">
                        <span className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${meta?.dotColor ?? "bg-gray-300"}`} />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta?.badgeColor ?? "bg-gray-100 text-gray-500"}`}>
                            {meta?.label ?? log.status}
                          </span>
                          <span className="text-xs text-gray-400">{dateStr} · {timeStr}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
