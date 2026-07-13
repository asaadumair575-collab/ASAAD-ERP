"use client";

import { useState, useTransition } from "react";

const PRESET_REASONS = [
  "Interested",
  "Not Interested",
  "Not Working in Balls",
  "Will Contact Later",
  "Wrong Number",
  "No Response",
  "Others",
];

export default function ContactReasonModal({
  action,
  triggerLabel = "Mark Contacted",
  triggerClassName,
}: {
  action: (reason?: string) => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const reason = selected === "Others" ? custom.trim() : selected;
    startTransition(async () => {
      await action(reason || undefined);
      setOpen(false);
      setSelected("");
      setCustom("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => { if (!isPending) setOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm space-y-4 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="font-semibold text-sm">Mark as Contacted</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Select the outcome of this contact
              </p>
            </div>

            <div className="space-y-1.5">
              {PRESET_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setSelected(r); if (r !== "Others") setCustom(""); }}
                  className={`w-full text-left text-sm px-3.5 py-2.5 rounded-xl border transition-colors ${
                    selected === r
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {selected === "Others" && (
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                autoFocus
                placeholder="Reason likhein..."
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setOpen(false); setSelected(""); setCustom(""); }}
                disabled={isPending}
                className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !selected || (selected === "Others" && !custom.trim())}
                className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Saving...
                  </>
                ) : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
