"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logRetailFollowupCall } from "@/lib/actions";

const OUTCOMES = [
  { value: "ORDER_RECEIVED", label: "✓ Ordered",        color: "bg-green-50 border-green-400 text-green-700 hover:bg-green-100" },
  { value: "CALLBACK",       label: "📞 Follow-up",     color: "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100" },
  { value: "NOT_INTERESTED", label: "✗ Not Interested", color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

export default function RetailFollowupCallButton({
  phone,
  customerName,
  lastStatus,
}: {
  phone: string;
  customerName: string;
  lastStatus?: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openModal() {
    setStatus("");
    setNote("");
    setOpen(true);
  }

  function saveNoAnswer() {
    startTransition(async () => {
      await logRetailFollowupCall(phone, "NO_ANSWER", "Call not picked");
      setOpen(false);
      router.refresh();
    });
  }

  function save() {
    if (!status) return;
    startTransition(async () => {
      await logRetailFollowupCall(phone, status, note);
      setOpen(false);
      router.refresh();
    });
  }

  const callLabel = lastStatus ? "Call Again" : "Log Call";

  return (
    <>
      <button
        onClick={openModal}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
      >
        {callLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Retail Follow-Up</p>
                <h3 className="text-sm font-semibold text-gray-800">{customerName}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{phone}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={saveNoAnswer}
              disabled={pending}
              className="w-full border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-yellow-100 transition-colors disabled:opacity-40"
            >
              📵 No Answer — Save & Done
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-300">or if call connected</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Outcome <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-3 gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setStatus(o.value)}
                    className={`border rounded-xl px-2 py-2.5 text-xs font-medium text-center transition-colors ${
                      status === o.value
                        ? o.color + " ring-2 ring-offset-1 ring-current"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {status && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Note <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="Add a note (optional)..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={pending || !status}
                className="bg-black text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {pending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
