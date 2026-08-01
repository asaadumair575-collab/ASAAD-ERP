"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logReorderCall } from "@/lib/actions";

const OUTCOMES = [
  { value: "ORDER_PLACED",   label: "✅ Interested",     color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "NOT_INTERESTED", label: "❌ Not Interested", color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const OUTCOMES_INTERESTED = [
  { value: "ORDER_RECEIVED", label: "🟢 Order Received", color: "bg-green-50 border-green-400 text-green-700 hover:bg-green-100" },
  { value: "ORDER_PLACED",   label: "✅ Still Interested", color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "NOT_INTERESTED", label: "❌ Not Interested",  color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const INTERESTED_REASONS = [
  "Has Stock — Will Order Later",
  "Will Inform When Needed",
  "Other",
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
  function extractReason(callNote: string) {
    const m = callNote.match(/^Reason:\s*(.+?)(?:\s*—|$)/);
    return m ? m[1].trim() : "";
  }
  function extractNote(callNote: string) {
    const m = callNote.match(/^Reason:.+?—\s*(.+)$/);
    return m ? m[1].trim() : (callNote.startsWith("Reason:") ? "" : callNote);
  }

  // "feedback" = step 1, "outcome" = step 2
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"feedback" | "outcome">("feedback");

  // Step 1 — feedback
  const [feedback, setFeedback] = useState<"POSITIVE" | "NEGATIVE" | "">("");
  const [feedbackNote, setFeedbackNote] = useState("");

  // Step 2 — outcome
  const [status, setStatus] = useState(lead.status === "PENDING" ? "" : lead.status);
  const [reason, setReason] = useState(lead.status === "NOT_INTERESTED" ? extractReason(lead.callNote) : "");
  const [otherText, setOtherText] = useState(
    lead.status === "NOT_INTERESTED" && extractReason(lead.callNote) === "Other" ? extractNote(lead.callNote) : ""
  );
  const [interestedReason, setInterestedReason] = useState(
    lead.status === "ORDER_PLACED" ? extractReason(lead.callNote) : ""
  );
  const [interestedOtherText, setInterestedOtherText] = useState(
    lead.status === "ORDER_PLACED" && extractReason(lead.callNote) === "Other" ? extractNote(lead.callNote) : ""
  );
  const [note, setNote] = useState(lead.status === "NOT_INTERESTED" ? extractNote(lead.callNote) : lead.callNote);

  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isNewCall = lead.status === "PENDING";
  const isInterestedUpdate = lead.status === "ORDER_PLACED" || lead.status === "ORDER_RECEIVED";
  const outcomeOptions = isInterestedUpdate ? OUTCOMES_INTERESTED : OUTCOMES;
  const isNotInterested = status === "NOT_INTERESTED";
  const isInterested = status === "ORDER_PLACED";
  const isOther = reason === "Other";
  const isInterestedOther = interestedReason === "Other";

  const canProceed = feedback && feedbackNote.trim();
  const canSave = status &&
    (!isNotInterested || (reason && (!isOther || otherText.trim()))) &&
    (!isInterested || (interestedReason && (!isInterestedOther || interestedOtherText.trim()))) &&
    note.trim() &&
    (isNewCall ? (feedback && feedbackNote.trim()) : true);

  function openModal() {
    // New call: start from feedback; Update: go straight to outcome
    setStep(isNewCall ? "feedback" : "outcome");
    if (isNewCall) {
      setFeedback("");
      setFeedbackNote("");
    }
    setOpen(true);
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    if (val !== "NOT_INTERESTED") { setReason(""); setOtherText(""); }
    else if (lead.status === "NOT_INTERESTED") setReason(extractReason(lead.callNote));
    if (val !== "ORDER_PLACED") { setInterestedReason(""); setInterestedOtherText(""); }
    else if (lead.status === "ORDER_PLACED") setInterestedReason(extractReason(lead.callNote));
  }

  function saveNoAnswer() {
    startTransition(async () => {
      await logReorderCall(lead.id, "NO_ANSWER", "Call not picked");
      setOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  function save() {
    if (!canSave) return;
    const effectiveReason = isOther ? `Other: ${otherText.trim()}` : reason;
    const effectiveInterestedReason = isInterestedOther ? `Other: ${interestedOtherText.trim()}` : interestedReason;
    const outcomeNote = isNotInterested
      ? `Reason: ${effectiveReason}${note ? ` — ${note}` : ""}`
      : isInterested && effectiveInterestedReason
      ? `Reason: ${effectiveInterestedReason}${note ? ` — ${note}` : ""}`
      : note;
    const finalNote = isNewCall && feedback
      ? `[${feedback === "POSITIVE" ? "👍 Positive" : "👎 Negative"}: ${feedbackNote.trim()}] ${outcomeNote}`.trim()
      : outcomeNote;
    startTransition(async () => {
      await logReorderCall(lead.id, status, finalNote);
      setOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
      >
        {lead.status === "PENDING" ? "Log Call" : "Update"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{lead.customerName}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.phone}</p>
              </div>
              {step === "outcome" && isNewCall && (
                <button
                  type="button"
                  onClick={() => setStep("feedback")}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  ← Back
                </button>
              )}
            </div>

            {/* Step indicator — only for new calls */}
            {isNewCall && (
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full ${step === "feedback" ? "bg-black" : "bg-green-500"}`} />
                <div className={`flex-1 h-1 rounded-full ${step === "outcome" ? "bg-black" : "bg-gray-200"}`} />
              </div>
            )}

            {/* ── STEP 1: Feedback ── */}
            {step === "feedback" && (
              <>
                {/* Quick: Call Not Picked */}
                <button
                  type="button"
                  onClick={saveNoAnswer}
                  disabled={pending}
                  className="w-full border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-yellow-100 transition-colors disabled:opacity-40"
                >
                  📵 Call Not Picked — Save & Done
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-300">ya call hui to</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Customer ka feedback kya tha?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedback("POSITIVE")}
                      className={`border rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                        feedback === "POSITIVE"
                          ? "bg-green-50 border-green-400 text-green-700 ring-2 ring-green-400 ring-offset-1"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      👍 Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedback("NEGATIVE")}
                      className={`border rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                        feedback === "NEGATIVE"
                          ? "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400 ring-offset-1"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      👎 Negative
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Feedback note <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    rows={3}
                    placeholder="Customer ne kya kaha? koi baat hui ho to likhein..."
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                      !feedbackNote.trim() ? "border-gray-300 focus:ring-gray-400" : "border-gray-200 focus:ring-black"
                    }`}
                  />
                  {!feedbackNote.trim() && (
                    <p className="text-xs text-gray-400 mt-1">Note likhna zaroori hai</p>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setOpen(false)} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => canProceed && setStep("outcome")}
                    disabled={!canProceed}
                    className="bg-black text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: Outcome ── */}
            {step === "outcome" && (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Call Outcome</p>
                  <div className="grid grid-cols-2 gap-2">
                    {outcomeOptions.map((o) => (
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

                {/* Interested reasons */}
                {isInterested && (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-violet-700">Interested — kya wajah hai abhi order nahi?</p>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTED_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setInterestedReason(r)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                            interestedReason === r
                              ? "bg-violet-600 text-white border-violet-600"
                              : "border-violet-200 text-violet-600 hover:bg-violet-100"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {isInterestedOther && (
                      <input
                        type="text"
                        autoFocus
                        value={interestedOtherText}
                        onChange={(e) => setInterestedOtherText(e.target.value)}
                        placeholder="Reason likhein..."
                        className="w-full border border-violet-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    )}
                    {!interestedReason && <p className="text-xs text-violet-400">Wajah select karna zaroori hai</p>}
                  </div>
                )}

                {/* Not Interested reasons */}
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

                {/* Note — always mandatory */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Note <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Call ke baare mein kuch likhein..."
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                      !note.trim() ? "border-gray-300 focus:ring-gray-400" : "border-gray-200 focus:ring-black"
                    }`}
                  />
                  {!note.trim() && (
                    <p className="text-xs text-gray-400 mt-1">Note likhna zaroori hai</p>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
