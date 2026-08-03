"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logRetailFollowupCall } from "@/lib/actions";

const OUTCOMES = [
  { value: "ORDER_RECEIVED", label: "✓ Ordered",        color: "bg-green-50 border-green-400 text-green-700 hover:bg-green-100" },
  { value: "CALLBACK",       label: "📞 Follow-up",     color: "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100" },
  { value: "NOT_INTERESTED", label: "✗ Not Interested", color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const NOT_INTERESTED_REASONS = [
  "Price Too High",
  "Already Has Stock",
  "Not Selling This Product",
  "Other",
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
  const [open, setOpen]     = useState(false);
  const [status, setStatus] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason]   = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [note, setNote]     = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openModal() {
    setStatus("");
    setOrderId("");
    setReason("");
    setOtherReason("");
    setNote("");
    setOpen(true);
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    if (val !== "NOT_INTERESTED") { setReason(""); setOtherReason(""); }
    if (val !== "ORDER_RECEIVED") setOrderId("");
  }

  const isOrderReceived   = status === "ORDER_RECEIVED";
  const isNotInterested   = status === "NOT_INTERESTED";
  const isOther           = reason === "Other";

  const canSave =
    !!status &&
    (!isOrderReceived || orderId.trim().length > 0) &&
    (!isNotInterested || (!!reason && (!isOther || otherReason.trim().length > 0)));

  function saveNoAnswer() {
    startTransition(async () => {
      await logRetailFollowupCall(phone, "NO_ANSWER", "Call not picked");
      setOpen(false);
      router.refresh();
    });
  }

  function save() {
    if (!canSave) return;
    const effectiveReason = isOther ? `Other: ${otherReason.trim()}` : reason;
    let finalNote = note.trim();
    if (isOrderReceived) {
      finalNote = `Order ID: ${orderId.trim()}` + (finalNote ? ` — ${finalNote}` : "");
    } else if (isNotInterested && effectiveReason) {
      finalNote = effectiveReason + (finalNote ? ` — ${finalNote}` : "");
    }
    startTransition(async () => {
      await logRetailFollowupCall(phone, status, finalNote || "");
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

            {/* Outcome buttons */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Outcome <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-3 gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleStatusChange(o.value)}
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

            {/* Order ID — required when Ordered */}
            {isOrderReceived && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Order ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-1234"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                {!orderId.trim() && (
                  <p className="text-xs text-red-400 mt-1">Order ID is required</p>
                )}
              </div>
            )}

            {/* Reason — required when Not Interested */}
            {isNotInterested && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-red-700">
                  Reason <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {NOT_INTERESTED_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                        reason === r
                          ? "bg-red-600 text-white border-red-600"
                          : "border-red-200 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {isOther && (
                  <input
                    type="text"
                    autoFocus
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Please specify..."
                    className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                )}
                {!reason && <p className="text-xs text-red-400">Please select a reason</p>}
              </div>
            )}

            {/* Optional note */}
            {status && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Note <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
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
                disabled={pending || !canSave}
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
