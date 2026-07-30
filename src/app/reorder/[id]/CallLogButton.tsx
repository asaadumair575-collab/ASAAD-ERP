"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logReorderCall } from "@/lib/actions";

const OUTCOMES = [
  { value: "ORDER_PLACED",   label: "✅ Interested → Order", color: "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" },
  { value: "CALLBACK",       label: "🔁 Callback",       color: "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" },
  { value: "NO_ANSWER",      label: "📵 No Answer",      color: "bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100" },
  { value: "NOT_INTERESTED", label: "❌ Not Interested", color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const NOT_INTERESTED_REASONS = [
  "Ball Quality",
  "Price Too High",
  "Already Has Stock",
  "Not Selling This Product",
  "Other",
];

export default function CallLogButton({
  lead,
  me,
}: {
  lead: { id: number; customerName: string; phone: string; status: string; callNote: string };
  me: { id: number; displayName: string | null };
}) {
  // Pre-extract reason from saved note e.g. "Reason: Ball Quality — extra note"
  function extractReason(callNote: string) {
    const m = callNote.match(/^Reason:\s*(.+?)(?:\s*—|$)/);
    return m ? m[1].trim() : "";
  }
  function extractNote(callNote: string) {
    const m = callNote.match(/^Reason:.+?—\s*(.+)$/);
    return m ? m[1].trim() : (callNote.startsWith("Reason:") ? "" : callNote);
  }

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(lead.status === "PENDING" ? "" : lead.status);
  const [reason, setReason] = useState(lead.status === "NOT_INTERESTED" ? extractReason(lead.callNote) : "");
  const [otherText, setOtherText] = useState(
    lead.status === "NOT_INTERESTED" && extractReason(lead.callNote) === "Other" ? extractNote(lead.callNote) : ""
  );
  const [note, setNote] = useState(lead.status === "NOT_INTERESTED" ? extractNote(lead.callNote) : lead.callNote);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isNotInterested = status === "NOT_INTERESTED";
  const isCallback = status === "CALLBACK";
  const isOther = reason === "Other";
  const canSave = status &&
    (!isNotInterested || (reason && (!isOther || otherText.trim()))) &&
    (!isCallback || note.trim());

  function handleStatusChange(val: string) {
    setStatus(val);
    if (val !== "NOT_INTERESTED") {
      setReason("");
      setOtherText("");
    } else if (lead.status === "NOT_INTERESTED") {
      setReason(extractReason(lead.callNote));
    }
  }

  function save() {
    if (!canSave) return;
    const effectiveReason = isOther ? `Other: ${otherText.trim()}` : reason;
    const finalNote = isNotInterested
      ? `Reason: ${effectiveReason}${note ? ` — ${note}` : ""}`
      : note;
    startTransition(async () => {
      await logReorderCall(lead.id, status, finalNote);
      setOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
      >
        {lead.status === "PENDING" ? "Log Call" : "Update"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{lead.customerName}</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.phone}</p>
            </div>

            {/* Outcome */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Call Outcome</p>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleStatusChange(o.value)}
                    className={`border rounded-xl px-3 py-2.5 text-xs font-medium text-left transition-colors ${
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

            {/* Not Interested reason — shown only when that outcome is selected */}
            {isNotInterested && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-red-700">Not interested ki wajah?</p>
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
                  <div className="mt-1">
                    <input
                      type="text"
                      autoFocus
                      value={otherText}
                      onChange={(e) => setOtherText(e.target.value)}
                      placeholder="Wajah likhein (zaroori)..."
                      className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    {!otherText.trim() && (
                      <p className="text-xs text-red-400 mt-1">Wajah likhna zaroori hai</p>
                    )}
                  </div>
                )}
                {!reason && (
                  <p className="text-xs text-red-400">Wajah select karna zaroori hai</p>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {isNotInterested ? "Extra note (optional)" : isCallback ? "Callback reason (zaroori)" : "Note (optional)"}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={isNotInterested ? "Kuch aur baat hui ho to..." : isCallback ? "Callback kyun? kab call karein?..." : "Add a note about this call..."}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                  isCallback && !note.trim()
                    ? "border-blue-300 focus:ring-blue-400"
                    : "border-gray-200 focus:ring-black"
                }`}
              />
              {isCallback && !note.trim() && (
                <p className="text-xs text-blue-500 mt-1">Callback ki wajah likhna zaroori hai</p>
              )}
            </div>

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
