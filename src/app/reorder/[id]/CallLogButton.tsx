"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const NO_ANSWER_DELAY = 25; // seconds employee must wait before logging Not Picked / Number Closed
import { logReorderCall, markReorderOrderReceived, deleteReorderLead, checkRetailOrder } from "@/lib/actions";

const OUTCOMES = [
  { value: "ORDER_PLACED",     label: "Interested",          color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "INTERESTED_LATER", label: "Interested — Not Now", color: "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" },
  { value: "NOT_INTERESTED",   label: "Not Interested",       color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const OUTCOMES_INTERESTED = [
  { value: "ORDER_RECEIVED",   label: "Order Received",       color: "bg-green-50 border-green-400 text-green-700 hover:bg-green-100" },
  { value: "ORDER_PLACED",     label: "Still Interested",     color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "INTERESTED_LATER", label: "Interested — Not Now", color: "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" },
  { value: "NOT_INTERESTED",   label: "Not Interested",       color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const OUTCOMES_NOT_INTERESTED = [
  { value: "ORDER_PLACED",     label: "Convinced",            color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "INTERESTED_LATER", label: "Interested — Not Now", color: "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" },
  { value: "NOT_INTERESTED",   label: "Not Convinced",        color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
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

const RETAIL_OUTCOMES = [
  { value: "ORDER_RECEIVED", label: "✓ Ordered",        color: "bg-green-50 border-green-400 text-green-700 hover:bg-green-100" },
  { value: "CALLBACK",       label: "📞 Follow-up",     color: "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100" },
  { value: "NOT_INTERESTED", label: "✗ Not Interested", color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const RETAIL_NOT_INTERESTED_REASONS = [
  "Price Too High",
  "Already Has Stock",
  "Not Selling This Product",
  "Other",
];

export default function CallLogButton({
  lead,
  me,
  callCount,
  simplified = false,
  noAnswerBlocked = false,
  todayStats,
}: {
  lead: { id: number; customerName: string; phone: string; status: string; callNote: string };
  me: { id: number; displayName: string | null; isAdmin?: boolean };
  callCount: number;
  simplified?: boolean;
  noAnswerBlocked?: boolean;
  todayStats?: { total: number; noAnswer: number };
}) {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState<"feedback" | "outcome">("feedback");
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const [countdown, setCountdown] = useState(NO_ANSWER_DELAY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const [simplifiedOrderId,    setSimplifiedOrderId]    = useState("");   // simplified mode order ID
  const [simplifiedReason,     setSimplifiedReason]     = useState("");   // simplified mode NI reason
  const [simplifiedOther,      setSimplifiedOther]      = useState("");   // simplified mode NI other text
  const [mainOrderId,          setMainOrderId]          = useState("");   // full mode order ID for ORDER_RECEIVED

  const [mainVerify,   setMainVerify]   = useState<null | "checking" | VerifyResult>(null);
  const [quickVerify,  setQuickVerify]  = useState<null | "checking" | VerifyResult>(null);
  const [simplVerify,  setSimplVerify]  = useState<null | "checking" | VerifyResult>(null);

  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Countdown timer — starts when modal opens, "Not Picked" blocked until 0
  useEffect(() => {
    if (open) {
      setCountdown(NO_ANSWER_DELAY);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  const isInterestedLead     = lead.status === "ORDER_PLACED" || lead.status === "ORDER_RECEIVED" || lead.status === "INTERESTED_LATER";
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
  const simplifiedIsOrderReceived = simplified && status === "ORDER_RECEIVED";
  const simplifiedIsNotInterested = simplified && status === "NOT_INTERESTED";
  const simplifiedIsOther         = simplifiedReason === "Other";

  async function verifyOrder(oid: string, setter: (v: null | "checking" | VerifyResult) => void) {
    if (!oid.trim()) { setter(null); return; }
    setter("checking");
    const result = await checkRetailOrder(oid.trim(), lead.phone);
    setter(result);
  }

  const canSave = simplified
    ? !!status &&
      (!simplifiedIsOrderReceived || simplifiedOrderId.trim().length > 0) &&
      (!simplifiedIsNotInterested || (!!simplifiedReason && (!simplifiedIsOther || simplifiedOther.trim().length > 0)))
    : !!status &&
      (!isOrderReceived || mainOrderId.trim().length > 0) &&
      (!showReasons || reasonsHidden || !isNotInterested  || (!!reason && (!isOther           || otherText.trim().length > 0))) &&
      (!isInterested || (!!interestedReason && (!isInterestedOther || interestedOtherText.trim().length > 0))) &&
      (!noteRequired || outcomeNote.trim().length > 0);

  function openModal() {
    if (noAnswerBlocked && lead.status !== "NO_ANSWER") { setShowBlockAlert(true); return; }
    setStep(simplified || (callCount > 0 && lead.status !== "NO_ANSWER") ? "outcome" : "feedback");
    setFeedback("");
    setFeedbackNote("");
    setStatus("");
    setReason("");
    setOtherText("");
    setInterestedReason("");
    setInterestedOtherText("");
    setOutcomeNote("");
    setFollowUpDate("");
    setSimplifiedOrderId("");
    setSimplifiedReason("");
    setSimplifiedOther("");
    setMainOrderId("");
    setMainVerify(null);
    setSimplVerify(null);
    setOpen(true);
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    if (val !== "NOT_INTERESTED") { setReason(""); setOtherText(""); setSimplifiedReason(""); setSimplifiedOther(""); }
    if (val !== "ORDER_PLACED")   { setInterestedReason(""); setInterestedOtherText(""); }
    if (val !== "ORDER_RECEIVED") { setSimplifiedOrderId(""); setMainOrderId(""); setMainVerify(null); setSimplVerify(null); }
  }

  function saveNoAnswer(note: string) {
    startTransition(async () => {
      await logReorderCall(lead.id, "NO_ANSWER", note);
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
    if (isOrderReceived && mainOrderId.trim()) {
      finalOutcomeNote = `Order ID: ${mainOrderId.trim()}` + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
    } else if (isNotInterested && effectiveReason) {
      finalOutcomeNote = effectiveReason + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
    } else if (isInterested && effectiveInterestedReason) {
      finalOutcomeNote = effectiveInterestedReason + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
    }

    // Simplified mode: build note from order ID or NI reason
    if (simplified) {
      if (simplifiedIsOrderReceived) {
        finalOutcomeNote = `Order ID: ${simplifiedOrderId.trim()}` + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
      } else if (simplifiedIsNotInterested) {
        const eff = simplifiedIsOther ? `Other: ${simplifiedOther.trim()}` : simplifiedReason;
        finalOutcomeNote = eff + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
      }
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
    setQuickVerify(null);
    setOrderConfirmOpen(true);
  }

  function confirmOrderDone() {
    if (!orderId.trim()) return;
    startTransition(async () => {
      await markReorderOrderReceived(lead.id, orderId.trim());
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
        {(lead.status === "ORDER_PLACED" || lead.status === "INTERESTED_LATER") && (
          <button
            onClick={quickOrderDone}
            disabled={pending}
            title="Order aa gaya!"
            className="text-xs px-2 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            🟢
          </button>
        )}
        {me.isAdmin && (
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={pending}
            title="Delete"
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            ✕
          </button>
        )}
      </div>

      {/* No-Answer block alert */}
      {showBlockAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowBlockAlert(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 px-6 py-5 text-center">
              <p className="text-4xl mb-2">🚫</p>
              <h2 className="text-white text-lg font-bold tracking-tight">New Calls Blocked</h2>
              <p className="text-red-200 text-sm mt-1">Too many unanswered calls today</p>
            </div>
            <div className="px-6 py-5 space-y-4 text-center">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-3xl font-bold text-red-700">
                  {todayStats?.noAnswer ?? 0} / {todayStats?.total ?? 0}
                </p>
                <p className="text-sm text-red-600 mt-0.5 font-medium">
                  No-answer calls today — {todayStats && todayStats.total > 0 ? Math.round((todayStats.noAnswer / todayStats.total) * 100) : 0}% (limit: 30%)
                </p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                You cannot log new leads until your no-answer rate drops below 30%.
                <br />
                Retry the leads who didn&apos;t pick up first.
              </p>
              <button
                onClick={() => {
                  setShowBlockAlert(false);
                  router.push(window.location.pathname + "?status=NO_ANSWER");
                }}
                className="w-full bg-yellow-500 text-white font-semibold text-sm py-3 rounded-xl hover:bg-yellow-600 transition-colors"
              >
                📵 Show No-Answer Leads ({todayStats?.noAnswer ?? 0})
              </button>
              <p className="text-xs text-gray-400">
                Triggered after min. 3 calls · resets each day
              </p>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setShowBlockAlert(false)}
                className="w-full border border-gray-200 text-gray-600 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Delete this lead?</h3>
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
              <h3 className="text-sm font-semibold text-gray-800">🟢 Confirm Order Received</h3>
              <p className="text-xs text-gray-400 mt-0.5">{lead.customerName}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Order ID <span className="text-red-500">*</span></label>
              <input
                type="text"
                autoFocus
                value={orderId}
                onChange={(e) => { setOrderId(e.target.value); setQuickVerify(null); }}
                onBlur={(e) => verifyOrder(e.target.value, setQuickVerify)}
                onKeyDown={(e) => e.key === "Enter" && confirmOrderDone()}
                placeholder="e.g. 1234"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              {!orderId.trim() && <p className="text-xs text-red-400 mt-1">Order ID is required</p>}
              <OrderVerifyBadge result={quickVerify} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOrderConfirmOpen(false)} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={confirmOrderDone}
                disabled={pending || !orderId.trim()}
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
              {!simplified && step === "outcome" && (callCount === 0 || lead.status === "NO_ANSWER") && (
                <button type="button" onClick={() => setStep("feedback")} className="text-xs text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              )}
            </div>

            {/* Step bar — for first call or when previous was no-answer (not in simplified mode) */}
            {!simplified && (callCount === 0 || lead.status === "NO_ANSWER") && (
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full ${step === "feedback" ? "bg-black" : "bg-green-500"}`} />
                <div className={`flex-1 h-1 rounded-full ${step === "outcome"  ? "bg-black" : "bg-gray-200"}`} />
              </div>
            )}

            {/* ── STEP 1: Feedback ── */}
            {step === "feedback" && (
              <>
                {/* Quick save — not picked / number closed (blocked until countdown reaches 0) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => saveNoAnswer("Call not picked")}
                    disabled={pending || countdown > 0}
                    className="border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-yellow-100 transition-colors disabled:opacity-40"
                  >
                    {countdown > 0 ? `📵 Not Picked (${countdown}s)` : "📵 Not Picked"}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveNoAnswer("Number closed")}
                    disabled={pending || countdown > 0}
                    className="border border-red-200 bg-red-50 text-red-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-red-100 transition-colors disabled:opacity-40"
                  >
                    {countdown > 0 ? `🔴 Closed (${countdown}s)` : "🔴 Number Closed"}
                  </button>
                </div>
                {countdown > 0 && (
                  <p className="text-xs text-gray-400 text-center">Wait {countdown}s — verifying call attempt</p>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-300">or if they answered</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Feedback buttons */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    What was the customer's response? <span className="text-red-500">*</span>
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
                    placeholder="What did the customer say?"
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                      !feedbackNote.trim() ? "border-gray-300 focus:ring-gray-400" : "border-gray-200 focus:ring-black"
                    }`}
                  />
                  {!feedbackNote.trim() && <p className="text-xs text-gray-400 mt-1">Note is required</p>}
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
                {/* No Answer quick buttons for simplified mode */}
                {simplified && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => saveNoAnswer("Call not picked")}
                        disabled={pending || countdown > 0}
                        className="border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-yellow-100 transition-colors disabled:opacity-40"
                      >
                        {countdown > 0 ? `📵 Not Picked (${countdown}s)` : "📵 Not Picked"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveNoAnswer("Number closed")}
                        disabled={pending || countdown > 0}
                        className="border border-red-200 bg-red-50 text-red-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-red-100 transition-colors disabled:opacity-40"
                      >
                        {countdown > 0 ? `🔴 Closed (${countdown}s)` : "🔴 Number Closed"}
                      </button>
                    </div>
                    {countdown > 0 && (
                      <p className="text-xs text-gray-400 text-center">Wait {countdown}s — verifying call attempt</p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-300">or if they answered</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  </>
                )}

                {/* Outcome buttons */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    {simplified ? "Order received?" : "What was the outcome?"} <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(simplified ? RETAIL_OUTCOMES : outcomeOptions).map((o) => (
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

                {/* Non-simplified: Order ID required when ORDER_RECEIVED */}
                {!simplified && isOrderReceived && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Order ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={mainOrderId}
                      onChange={(e) => { setMainOrderId(e.target.value); setMainVerify(null); }}
                      onBlur={(e) => verifyOrder(e.target.value, setMainVerify)}
                      placeholder="e.g. 1234"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    {!mainOrderId.trim() && <p className="text-xs text-red-400 mt-1">Order ID is required</p>}
                    <OrderVerifyBadge result={mainVerify} />
                  </div>
                )}

                {/* Simplified: Order ID required when Ordered */}
                {simplified && simplifiedIsOrderReceived && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Order ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={simplifiedOrderId}
                      onChange={(e) => { setSimplifiedOrderId(e.target.value); setSimplVerify(null); }}
                      onBlur={(e) => verifyOrder(e.target.value, setSimplVerify)}
                      placeholder="e.g. 1234"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    {!simplifiedOrderId.trim() && (
                      <p className="text-xs text-red-400 mt-1">Order ID is required</p>
                    )}
                    <OrderVerifyBadge result={simplVerify} />
                  </div>
                )}

                {/* Simplified: Reason required when Not Interested */}
                {simplified && simplifiedIsNotInterested && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-700">
                      Reason <span className="text-red-500">*</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {RETAIL_NOT_INTERESTED_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSimplifiedReason(r)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                            simplifiedReason === r
                              ? "bg-red-600 text-white border-red-600"
                              : "border-red-200 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {simplifiedIsOther && (
                      <input
                        type="text"
                        autoFocus
                        value={simplifiedOther}
                        onChange={(e) => setSimplifiedOther(e.target.value)}
                        placeholder="Please specify..."
                        className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    )}
                    {!simplifiedReason && <p className="text-xs text-red-400">Please select a reason</p>}
                  </div>
                )}

                {/* Interested reasons — hide in simplified mode */}
                {!simplified && isInterested && (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-violet-700">
                      Why no order yet? <span className="text-red-500">*</span>
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
                        placeholder="Specify reason..."
                        className="w-full border border-violet-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    )}
                    {!interestedReason && <p className="text-xs text-violet-400">Please select a reason</p>}
                  </div>
                )}

                {/* Follow-up date — not needed in simplified mode */}
                {!simplified && isInterested && (
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

                {/* Not Interested reasons — hide in simplified mode or if already NOT_INTERESTED */}
                {!simplified && showReasons && isNotInterested && !isNotInterestedLead && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-700">
                      Reason for not interested? <span className="text-red-500">*</span>
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
                        placeholder="Specify reason..."
                        className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    )}
                    {!reason && <p className="text-xs text-red-400">Please select a reason</p>}
                  </div>
                )}

                {/* Outcome note — always optional in simplified mode */}
                {(simplified || reasonsHidden || (showReasons && !isOther && !isInterestedOther)) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Note{!simplified && <span className="text-red-500"> *</span>}{simplified && <span className="text-gray-400"> (optional)</span>}
                    </label>
                    <textarea
                      value={outcomeNote}
                      onChange={(e) => setOutcomeNote(e.target.value)}
                      rows={2}
                      placeholder="Any additional notes..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    />
                    {!simplified && !outcomeNote.trim() && <p className="text-xs text-gray-400 mt-1">Note is required</p>}
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

type VerifyResult = { found: boolean; order?: { id: number; customerName: string; phone: string | null; status: string }; phoneMatch: boolean };

function OrderVerifyBadge({ result }: { result: null | "checking" | VerifyResult }) {
  if (!result) return null;
  if (result === "checking") {
    return <p className="text-xs text-gray-400 mt-1.5">🔍 Verifying...</p>;
  }
  if (!result.found) {
    return (
      <div className="mt-1.5 text-xs rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700 font-medium">
        ❌ Order not found in retail orders
      </div>
    );
  }
  if (result.phoneMatch) {
    return (
      <div className="mt-1.5 text-xs rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-green-700 font-medium">
        ✅ Order #{result.order!.id} — {result.order!.customerName} — Phone match ✓
      </div>
    );
  }
  return (
    <div className="mt-1.5 text-xs rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700 font-medium">
      ⚠️ Order #{result.order!.id} found ({result.order!.customerName}) — but phone does not match
    </div>
  );
}
