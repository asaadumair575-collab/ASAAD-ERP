"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logReorderCall, markReorderOrderReceived, deleteReorderLead } from "@/lib/actions";

const OUTCOMES = [
  { value: "ORDER_PLACED",   label: "✅ Interested",     color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "NOT_INTERESTED", label: "❌ Not Interested", color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const OUTCOMES_INTERESTED = [
  { value: "ORDER_RECEIVED", label: "🟢 Order Received",   color: "bg-green-50 border-green-400 text-green-700 hover:bg-green-100" },
  { value: "ORDER_PLACED",   label: "✅ Still Interested", color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "NOT_INTERESTED", label: "❌ Not Interested",   color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const OUTCOMES_NOT_INTERESTED = [
  { value: "ORDER_PLACED",   label: "✅ Convinced",     color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "NOT_INTERESTED", label: "❌ Not Convinced", color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const INTERESTED_REASONS = [
  "Has Stock — Will Order Later",
  "Will Inform When Needed",
  "Sent a Message",
  "Other",
];

const NOT_INTERESTED_REASONS = [
  "Price Too High",
  "Already Has Stock",
  "Not Selling This Product",
  "Other",
];

export default function CallLogButton({
  lead,
  me,
  callCount,
}: {
  lead: { id: number; customerName: string; phone: string; status: string; callNote: string };
  me: { id: number; displayName: string | null };
  callCount: number;
}) {
  const [open, setOpen]   = useState(false);
  const [step, setStep]   = useState<"feedback" | "outcome">("feedback");

  // Step 1
  const [feedback,     setFeedback]     = useState<"POSITIVE" | "NEGATIVE" | "">("");
  const [feedbackNote, setFeedbackNote] = useState("");

  // Step 2
  const [status,               setStatus]               = useState("");
  const [reason,               setReason]               = useState("");   // NOT_INTERESTED reason
  const [otherText,            setOtherText]            = useState("");   // when reason = Other
  const [interestedReason,     setInterestedReason]     = useState("");   // ORDER_PLACED reason
  const [interestedOtherText,  setInterestedOtherText]  = useState("");   // when interestedReason = Other
  const [outcomeNote,          setOutcomeNote]          = useState("");
  const [followUpDate,         setFollowUpDate]         = useState("");

  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isInterestedLead     = lead.status === "ORDER_PLACED" || lead.status === "ORDER_RECEIVED";
  const isNotInterestedLead  = lead.status === "NOT_INTERESTED";
  const outcomeOptions       = isInterestedLead    ? OUTCOMES_INTERESTED
                             : isNotInterestedLead ? OUTCOMES_NOT_INTERESTED
                             : OUTCOMES;

  const isNotInterested   = status === "NOT_INTERESTED";
  const isInterested      = status === "ORDER_PLACED";
  const isOrderReceived   = status === "ORDER_RECEIVED";
  const isOther           = reason === "Other";
  const isInterestedOther = interestedReason === "Other";

  // Step 1 can proceed: feedback selected + note written
  const canProceed = !!feedback && feedbackNote.trim().length > 0;

  // Step 2 can save:
  // - status must be selected
  // - if NOT_INTERESTED: reason required; if Other → otherText required (replaces note)
  // - if ORDER_PLACED: interestedReason required; if Other → interestedOtherText required (replaces note)
  // - if ORDER_RECEIVED: outcomeNote required
  // - note required UNLESS "Other" is selected (Other's own field covers it)
  const isNegative    = feedback === "NEGATIVE";
  const showReasons   = !isNegative; // negative feedback = reason already in feedback note
  const reasonsHidden = isNotInterestedLead && isNotInterested; // already-NI lead marked NI again
  const noteRequired  = (showReasons && !isOther && !isInterestedOther && !isInterested) || reasonsHidden;
  const canSave =
    !!status &&
    (!showReasons || reasonsHidden || !isNotInterested  || (!!reason && (!isOther           || otherText.trim().length > 0))) &&
    (!isInterested || (!!interestedReason && (!isInterestedOther || interestedOtherText.trim().length > 0))) &&
    (!noteRequired || outcomeNote.trim().length > 0);

  function openModal() {
    setStep(callCount === 0 || lead.status === "NO_ANSWER" ? "feedback" : "outcome");
    setFeedback("");
    setFeedbackNote("");
    setStatus("");
    setReason("");
    setOtherText("");
    setInterestedReason("");
    setInterestedOtherText("");
    setOutcomeNote("");
    setFollowUpDate("");
    setOpen(true);
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    if (val !== "NOT_INTERESTED") { setReason(""); setOtherText(""); }
    if (val !== "ORDER_PLACED")   { setInterestedReason(""); setInterestedOtherText(""); }
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

    // Build the reason part
    const effectiveReason           = isOther           ? `Other: ${otherText.trim()}`           : reason;
    const effectiveInterestedReason = isInterestedOther ? `Other: ${interestedOtherText.trim()}` : interestedReason;

    // Build outcome note
    let finalOutcomeNote = outcomeNote.trim();
    if (isNotInterested && effectiveReason) {
      finalOutcomeNote = effectiveReason + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
    } else if (isInterested && effectiveInterestedReason) {
      finalOutcomeNote = effectiveInterestedReason + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
    }

    // Prepend feedback only if it was collected (first call)
    const fullNote = feedback
      ? `[${feedback === "POSITIVE" ? "👍 Positive" : "👎 Negative"}: ${feedbackNote.trim()}] ${finalOutcomeNote}`.trim()
      : finalOutcomeNote;

    startTransition(async () => {
      await logReorderCall(lead.id, status, fullNote, isInterested ? followUpDate : null);
      setOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  const callLabel = callCount === 0 ? "Log Call" : `Call ${callCount + 1}`;

  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function quickOrderDone() {
    setOrderId("");
    setOrderConfirmOpen(true);
  }

  function confirmOrderDone() {
    startTransition(async () => {
      await markReorderOrderReceived(lead.id, orderId.trim() || null);
      setOrderConfirmOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={openModal}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap"
        >
          {callLabel}
        </button>
        {lead.status === "ORDER_PLACED" && (
          <button
            onClick={quickOrderDone}
            disabled={pending}
            title="Order aa gaya!"
            className="text-xs px-2 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            🟢
          </button>
        )}
        <button
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={pending}
          title="Delete"
          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      {/* Delete confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Delete karna chahte ho?</h3>
              <p className="text-xs text-gray-500 mt-1">{lead.customerName} · {lead.phone}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirmOpen(false)} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  startTransition(async () => {
                    await deleteReorderLead(lead.id);
                    setDeleteConfirmOpen(false);
                    router.replace(window.location.pathname + window.location.search);
                  });
                }}
                disabled={pending}
                className="bg-red-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {pending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order confirmation popup */}
      {orderConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOrderConfirmOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">🟢 Order Received?</h3>
              <p className="text-xs text-gray-400 mt-0.5">{lead.customerName}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Order ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                autoFocus
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmOrderDone()}
                placeholder="e.g. ORD-1234"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOrderConfirmOpen(false)} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={confirmOrderDone}
                disabled={pending}
                className="bg-green-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                {pending ? "Saving..." : "Order Received ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{callLabel}</p>
                <h3 className="text-sm font-semibold text-gray-800">{lead.customerName}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.phone}</p>
              </div>
              {step === "outcome" && (callCount === 0 || lead.status === "NO_ANSWER") && (
                <button type="button" onClick={() => setStep("feedback")} className="text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              )}
            </div>

            {/* Step bar — for first call or when previous was no-answer */}
            {(callCount === 0 || lead.status === "NO_ANSWER") && (
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full ${step === "feedback" ? "bg-black" : "bg-green-500"}`} />
                <div className={`flex-1 h-1 rounded-full ${step === "outcome"  ? "bg-black" : "bg-gray-200"}`} />
              </div>
            )}

            {/* ── STEP 1: Feedback ── */}
            {step === "feedback" && (
              <>
                {/* Quick save */}
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

                {/* Feedback buttons */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Customer ka feedback kya tha? <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: "POSITIVE", label: "👍 Positive", sel: "bg-green-50 border-green-400 text-green-700 ring-2 ring-green-400 ring-offset-1" },
                      { val: "NEGATIVE", label: "👎 Negative", sel: "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400 ring-offset-1"   },
                    ].map(({ val, label, sel }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFeedback(val as "POSITIVE" | "NEGATIVE")}
                        className={`border rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                          feedback === val ? sel : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback note — mandatory */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Note <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    rows={3}
                    placeholder="Customer ne kya kaha?"
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                      !feedbackNote.trim() ? "border-gray-300 focus:ring-gray-400" : "border-gray-200 focus:ring-black"
                    }`}
                  />
                  {!feedbackNote.trim() && <p className="text-xs text-gray-400 mt-1">Note likhna zaroori hai</p>}
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
                {/* Outcome buttons */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Call ka outcome kya raha? <span className="text-red-500">*</span>
                  </p>
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

                {/* Interested reasons — always show so follow-up context is clear */}
                {isInterested && (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-violet-700">
                      Abhi order kyun nahi? <span className="text-red-500">*</span>
                    </p>
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
                        placeholder="Wajah likhein..."
                        className="w-full border border-violet-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    )}
                    {!interestedReason && <p className="text-xs text-violet-400">Wajah select karni zaroori hai</p>}
                  </div>
                )}

                {/* Follow-up date — mandatory when Interested */}
                {isInterested && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Follow-up Date <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                )}

                {/* Not Interested reasons — hide if lead was already NOT_INTERESTED (reason known) */}
                {showReasons && isNotInterested && !isNotInterestedLead && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-700">
                      Not interested ki wajah? <span className="text-red-500">*</span>
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
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        placeholder="Wajah likhein..."
                        className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    )}
                    {!reason && <p className="text-xs text-red-400">Wajah select karni zaroori hai</p>}
                  </div>
                )}

                {/* Outcome note */}
                {(reasonsHidden || (showReasons && !isOther && !isInterestedOther)) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={outcomeNote}
                      onChange={(e) => setOutcomeNote(e.target.value)}
                      rows={2}
                      placeholder="Koi aur baat ho to likhein..."
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                        !outcomeNote.trim() ? "border-gray-300 focus:ring-gray-400" : "border-gray-200 focus:ring-black"
                      }`}
                    />
                    {!outcomeNote.trim() && <p className="text-xs text-gray-400 mt-1">Note likhna zaroori hai</p>}
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
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
