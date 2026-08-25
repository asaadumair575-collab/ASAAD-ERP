"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { logReorderCall, markReorderOrderReceived, deleteReorderLead, checkRetailOrder, recordCallAttempt, recordCallAbort } from "@/lib/actions";

const OUTCOMES = [
  { value: "ORDER_PLACED",     label: "Interested",           color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "INTERESTED_LATER", label: "Interested — Not Now", color: "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" },
  { value: "NOT_INTERESTED",   label: "Not Interested",       color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
  { value: "CALLBACK",         label: "📦 Maal Nahi Mila",   color: "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100" },
];

const OUTCOMES_WITH_RECEIVED = [
  { value: "ORDER_RECEIVED",   label: "Order Received",       color: "bg-green-50 border-green-400 text-green-700 hover:bg-green-100" },
  { value: "ORDER_PLACED",     label: "Still Interested",     color: "bg-violet-50 border-violet-400 text-violet-700 hover:bg-violet-100" },
  { value: "INTERESTED_LATER", label: "Interested — Not Now", color: "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" },
  { value: "NOT_INTERESTED",   label: "Not Interested",       color: "bg-red-50 border-red-300 text-red-600 hover:bg-red-100" },
];

const NOTE_PLACEHOLDER: Record<string, string> = {
  ORDER_PLACED:     "What did they say about re-ordering? Any details or commitments?",
  INTERESTED_LATER: "What did they say? When might they order?",
  NOT_INTERESTED:   "Why are they not interested? What did they say?",
  ORDER_RECEIVED:   "Any notes about the order?",
  CALLBACK:         "What did the customer say? When will they receive the product?",
};

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
}: {
  lead: { id: number; customerName: string; phone: string; status: string; callNote: string; city?: string | null; address?: string | null; postexTrackingNumber?: string | null };
  me: { id: number; displayName: string | null; isAdmin?: boolean };
  callCount: number;
  simplified?: boolean;
}) {
  const [open, setOpen]               = useState(false);
  const [step, setStep]               = useState<"delivery" | "feedback" | "outcome">("delivery");
  const [showPhone, setShowPhone]     = useState(false);
  const [abortConfirm, setAbortConfirm] = useState<"first" | "second" | null>(null);

  // Step 0 — delivery check
  const [maalMila, setMaalMila] = useState<boolean | null>(null);

  // Step 1 — feedback
  const [feedback,     setFeedback]     = useState<"POSITIVE" | "NEGATIVE" | "">("");
  const [feedbackNote, setFeedbackNote] = useState("");

  // Step 2 — outcome
  const [status,     setStatus]     = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [mainOrderId, setMainOrderId] = useState("");
  const [mainVerify,  setMainVerify]  = useState<null | "checking" | VerifyResult>(null);

  // Simplified-mode state
  const [simplifiedOrderId, setSimplifiedOrderId] = useState("");
  const [simplifiedReason,  setSimplifiedReason]  = useState("");
  const [simplifiedOther,   setSimplifiedOther]   = useState("");
  const [simplVerify,       setSimplVerify]        = useState<null | "checking" | VerifyResult>(null);

  const [pending, startTransition] = useTransition();
  const [cooldownError, setCooldownError] = useState<string | null>(null);
  const router = useRouter();

  // Auto-abort when employee switches tab after Show Number
  const showPhoneRef = useRef(showPhone);
  const openRef = useRef(open);
  showPhoneRef.current = showPhone;
  openRef.current = open;

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && openRef.current && showPhoneRef.current) {
        startTransition(async () => {
          await recordCallAbort(lead.id);
          setOpen(false);
          setAbortConfirm(null);
          router.replace(window.location.pathname + window.location.search);
        });
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [lead.id, router]);

  const isInterestedLead = lead.status === "ORDER_PLACED" || lead.status === "ORDER_RECEIVED" || lead.status === "INTERESTED_LATER";
  const outcomeOptions   = isInterestedLead ? OUTCOMES_WITH_RECEIVED : OUTCOMES;
  const isOrderReceived  = status === "ORDER_RECEIVED";
  const simplifiedIsOrderReceived = simplified && status === "ORDER_RECEIVED";
  const simplifiedIsNotInterested = simplified && status === "NOT_INTERESTED";
  const simplifiedIsOther         = simplifiedReason === "Other";

  // Step 1 can proceed: feedback selected + note written
  const canProceed = !!feedback && feedbackNote.trim().length > 0;

  const mainVerifyOk = mainVerify !== null && mainVerify !== "checking" && mainVerify.found && (mainVerify.phoneMatch || mainVerify.nameMatch);
  const simplVerifyOk = simplVerify !== null && simplVerify !== "checking" && simplVerify.found && (simplVerify.phoneMatch || simplVerify.nameMatch);

  const canSave = simplified
    ? !!status &&
      (!simplifiedIsOrderReceived || (simplifiedOrderId.trim().length > 0 && simplVerifyOk)) &&
      (!simplifiedIsNotInterested || (!!simplifiedReason && (!simplifiedIsOther || simplifiedOther.trim().length > 0)))
    : !!status &&
      (!isOrderReceived ? outcomeNote.trim().length > 0 : (mainOrderId.trim().length > 0 && mainVerifyOk));

  async function verifyOrder(oid: string, setter: (v: null | "checking" | VerifyResult) => void) {
    if (!oid.trim()) { setter(null); return; }
    setter("checking");
    const result = await checkRetailOrder(oid.trim(), lead.phone, lead.customerName);
    setter(result);
  }

  function openModal() {
    setShowPhone(false);
    setStep(simplified || (callCount > 0 && lead.status !== "NO_ANSWER") ? "outcome" : "delivery");
    setMaalMila(null);
    setFeedback("");
    setFeedbackNote("");
    setStatus("");
    setOutcomeNote("");
    setMainOrderId("");
    setMainVerify(null);
    setSimplifiedOrderId("");
    setSimplifiedReason("");
    setSimplifiedOther("");
    setSimplVerify(null);
    setCooldownError(null);
    setOpen(true);
  }

  function tryClose() {
    setAbortConfirm("first");
  }

  function confirmAbort() {
    startTransition(async () => {
      await recordCallAbort(lead.id);
      setAbortConfirm(null);
      setOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }


  function handleStatusChange(val: string) {
    setStatus(val);
    if (val !== "ORDER_RECEIVED") { setMainOrderId(""); setMainVerify(null); setSimplifiedOrderId(""); setSimplVerify(null); }
    if (val !== "NOT_INTERESTED") { setSimplifiedReason(""); setSimplifiedOther(""); }
  }

  function saveNoAnswer(noAnswerNote: string) {
    setCooldownError(null);
    startTransition(async () => {
      const result = await logReorderCall(lead.id, "NO_ANSWER", noAnswerNote);
      if (result && "error" in result) {
        setCooldownError(result.error);
        return;
      }
      setOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  function save() {
    if (!canSave) return;

    let finalNote = outcomeNote.trim();

    if (simplified) {
      if (simplifiedIsOrderReceived) {
        finalNote = `Order ID: ${simplifiedOrderId.trim()}`;
      } else if (simplifiedIsNotInterested) {
        const eff = simplifiedIsOther ? `Other: ${simplifiedOther.trim()}` : simplifiedReason;
        finalNote = eff;
      }
    } else if (isOrderReceived && mainOrderId.trim()) {
      finalNote = `Order ID: ${mainOrderId.trim()}` + (outcomeNote.trim() ? ` — ${outcomeNote.trim()}` : "");
    }

    // Prepend delivery status + feedback if collected (first call)
    const deliveryPrefix = maalMila === false ? "[📦 Not Delivered Yet] " : "";
    const feedbackPrefix = feedback ? `[${feedback === "POSITIVE" ? "👍 Positive" : "👎 Negative"}: ${feedbackNote.trim()}] ` : "";
    const fullNote = `${deliveryPrefix}${feedbackPrefix}${finalNote}`.trim();

    startTransition(async () => {
      await logReorderCall(lead.id, status, fullNote);
      setOpen(false);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  const callLabel = callCount === 0 ? "Log Call" : `Call ${callCount + 1}`;

  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [quickVerify, setQuickVerify] = useState<null | "checking" | VerifyResult>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Retail Postex dispatch
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchAmount, setDispatchAmount] = useState("");
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ tracking?: string; error?: string } | null>(null);

  function quickOrderDone() {
    setOrderId("");
    setQuickVerify(null);
    setOrderConfirmOpen(true);
  }

  const quickVerifyOk = quickVerify !== null && quickVerify !== "checking" && quickVerify.found && (quickVerify.phoneMatch || quickVerify.nameMatch);

  function confirmOrderDone() {
    if (!orderId.trim() || !quickVerifyOk) return;
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
        {simplified && lead.status === "ORDER_RECEIVED" && (
          lead.postexTrackingNumber ? (
            <span className="text-xs px-2 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-medium whitespace-nowrap" title={lead.postexTrackingNumber}>
              📦 {lead.postexTrackingNumber}
            </span>
          ) : (
            <button
              onClick={() => { setDispatchOpen(true); setDispatchResult(null); setDispatchAmount(""); }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors whitespace-nowrap"
            >
              🚚 Dispatch
            </button>
          )
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteConfirmOpen(false)}>
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40" onClick={() => setOrderConfirmOpen(false)}>
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
                disabled={pending || !orderId.trim() || !quickVerifyOk}
                className="bg-green-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                {pending ? "Saving..." : "Order Received ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40" onClick={tryClose}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{callLabel}</p>
                <h3 className="text-sm font-semibold text-gray-800">{lead.customerName}</h3>
              </div>
              {!simplified && (callCount === 0 || lead.status === "NO_ANSWER") && step !== "delivery" && (
                <button
                  type="button"
                  onClick={() => setStep(step === "outcome" ? "feedback" : "delivery")}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ← Back
                </button>
              )}
            </div>

            {/* Phone number — hidden until revealed */}
            {showPhone ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-center">
                <p className="text-2xl font-bold font-mono tracking-widest text-gray-900 select-all">{lead.phone}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowPhone(true); recordCallAttempt(lead.id).catch(() => {}); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-center text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                👁 Show Number
              </button>
            )}

            {/* Everything below phone button is locked until Show Number is clicked */}
            <div className={!showPhone ? "pointer-events-none opacity-40 select-none" : ""}>

            {/* Step bar — for first call or when previous was no-answer (not in simplified mode) */}
            {!simplified && (callCount === 0 || lead.status === "NO_ANSWER") && (
              <div className="flex items-center gap-1">
                <div className={`flex-1 h-1 rounded-full ${step === "delivery" ? "bg-black" : "bg-green-500"}`} />
                <div className={`flex-1 h-1 rounded-full ${step === "feedback" ? "bg-black" : step === "outcome" ? "bg-green-500" : "bg-gray-200"}`} />
                <div className={`flex-1 h-1 rounded-full ${step === "outcome"  ? "bg-black" : "bg-gray-200"}`} />
              </div>
            )}

            {/* ── STEP 0: Delivery check ── */}
            {step === "delivery" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => saveNoAnswer("Call not picked")}
                    disabled={pending || !showPhone}
                    title={!showPhone ? "Show number first" : undefined}
                    className="border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-yellow-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    📵 Not Picked
                  </button>
                  <button
                    type="button"
                    onClick={() => saveNoAnswer("Number closed")}
                    disabled={pending || !showPhone}
                    title={!showPhone ? "Show number first" : undefined}
                    className="border border-red-200 bg-red-50 text-red-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    🔴 Number Closed
                  </button>
                </div>
                {!showPhone && (
                  <p className="text-[11px] text-center text-gray-400">
                    👆 Show number first to enable call logging
                  </p>
                )}
                {cooldownError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 text-center font-medium">
                    ⏱ {cooldownError}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-300">or if they answered</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Was the previous order delivered to the customer? <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMaalMila(true)}
                      className={`border rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                        maalMila === true
                          ? "bg-green-50 border-green-400 text-green-700 ring-2 ring-green-400 ring-offset-1"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      ✅ Yes, Delivered
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaalMila(false)}
                      className={`border rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                        maalMila === false
                          ? "bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-400 ring-offset-1"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      📦 Not Delivered Yet
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={tryClose} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (maalMila === true) setStep("feedback");
                      else if (maalMila === false) setStep("outcome");
                    }}
                    disabled={maalMila === null || !showPhone}
                    className="bg-black text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 1: Feedback ── */}
            {step === "feedback" && (
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    What was the customer&apos;s response? <span className="text-red-500">*</span>
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
                  <button onClick={tryClose} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
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
                {/* No Answer quick buttons — simplified mode OR second call */}
                {(simplified || callCount > 0) && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => saveNoAnswer("Call not picked")}
                        disabled={pending || !showPhone}
                        title={!showPhone ? "Show number first" : undefined}
                        className="border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-yellow-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        📵 Not Picked
                      </button>
                      <button
                        type="button"
                        onClick={() => saveNoAnswer("Number closed")}
                        disabled={pending || !showPhone}
                        title={!showPhone ? "Show number first" : undefined}
                        className="border border-red-200 bg-red-50 text-red-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        🔴 Number Closed
                      </button>
                    </div>
                    {!showPhone && (
                      <p className="text-[11px] text-center text-gray-400">
                        👆 Show number first to enable call logging
                      </p>
                    )}
                    {cooldownError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 text-center font-medium">
                        ⏱ {cooldownError}
                      </div>
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

                {/* Non-simplified: Order ID when ORDER_RECEIVED */}
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

                {/* Simplified: Order ID when Ordered */}
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
                    {!simplifiedOrderId.trim() && <p className="text-xs text-red-400 mt-1">Order ID is required</p>}
                    <OrderVerifyBadge result={simplVerify} />
                  </div>
                )}

                {/* Simplified: Reason when Not Interested */}
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

                {/* Non-simplified: mandatory note for any outcome except ORDER_RECEIVED */}
                {!simplified && !!status && !isOrderReceived && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      autoFocus
                      value={outcomeNote}
                      onChange={(e) => setOutcomeNote(e.target.value)}
                      rows={3}
                      placeholder={NOTE_PLACEHOLDER[status] ?? "What did the customer say?"}
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                        !outcomeNote.trim() ? "border-gray-300 focus:ring-gray-400" : "border-gray-200 focus:ring-black"
                      }`}
                    />
                    {!outcomeNote.trim() && <p className="text-xs text-gray-400 mt-1">Note is required</p>}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button onClick={tryClose} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
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

            </div>{/* end locked wrapper */}
          </div>
        </div>
      )}

      {/* Retail Postex Dispatch Modal */}
      {dispatchOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40" onClick={() => !dispatchLoading && setDispatchOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Dispatch via Postex</h3>
                <p className="text-xs text-gray-400 mt-0.5">{lead.customerName} · {lead.phone}</p>
                {lead.city && <p className="text-xs text-gray-400">{lead.city}</p>}
                {lead.address && <p className="text-xs text-gray-400 truncate max-w-[200px]">{lead.address}</p>}
              </div>
              {!dispatchLoading && (
                <button onClick={() => setDispatchOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
              )}
            </div>

            {!dispatchResult && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">COD Amount (Rs) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  autoFocus
                  value={dispatchAmount}
                  onChange={(e) => setDispatchAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            )}

            {dispatchResult?.tracking && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-green-700">✓ Dispatched!</p>
                <p className="text-xs text-green-600 mt-0.5">Tracking: <span className="font-mono font-semibold">{dispatchResult.tracking}</span></p>
              </div>
            )}

            {dispatchResult?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-red-700">✗ Failed</p>
                <p className="text-xs text-red-500 mt-0.5 break-words">{dispatchResult.error}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              {!dispatchResult ? (
                <>
                  <button onClick={() => setDispatchOpen(false)} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    disabled={dispatchLoading || !dispatchAmount.trim()}
                    onClick={async () => {
                      setDispatchLoading(true);
                      try {
                        const res = await fetch("/api/reorder/postex-dispatch", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ leadId: lead.id, amount: Number(dispatchAmount) }),
                        });
                        const data = await res.json();
                        setDispatchResult(data.tracking ? { tracking: data.tracking } : { error: data.error ?? "Unknown error" });
                        if (data.tracking) router.replace(window.location.pathname + window.location.search);
                      } catch (e) {
                        setDispatchResult({ error: String(e) });
                      }
                      setDispatchLoading(false);
                    }}
                    className="flex items-center gap-2 bg-orange-500 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors"
                  >
                    {dispatchLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {dispatchLoading ? "Booking…" : "Book on Postex"}
                  </button>
                </>
              ) : (
                <button onClick={() => setDispatchOpen(false)} className="bg-gray-800 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-black transition-colors">
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Abort confirmation — first */}
      {abortConfirm === "first" && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Are you sure you want to go back?</h3>
              <p className="text-xs text-gray-500 mt-1">
                You have already viewed the phone number. Going back will be recorded and visible to admin.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAbortConfirm(null)}
                className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Stay
              </button>
              <button
                onClick={() => setAbortConfirm("second")}
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Yes, Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abort confirmation — second (final) */}
      {abortConfirm === "second" && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-red-700">Are you absolutely sure?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This lead will be removed from your list and admin will be alerted that you viewed the number and went back.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAbortConfirm(null)}
                className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAbort}
                disabled={pending}
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-40"
              >
                {pending ? "..." : "Yes, I'm Sure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type VerifyResult = { found: boolean; order?: { id: number; customerName: string; phone: string | null; status: string }; phoneMatch: boolean; nameMatch: boolean };

function OrderVerifyBadge({ result }: { result: null | "checking" | VerifyResult }) {
  if (!result) return null;
  if (result === "checking") {
    return <p className="text-xs text-gray-400 mt-1.5">🔍 Verifying...</p>;
  }
  if (!result.found) {
    return (
      <div className="mt-1.5 text-xs rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700 font-medium">
        ❌ Order not found — cannot save as Order Received
      </div>
    );
  }
  const matched = result.phoneMatch || result.nameMatch;
  if (matched) {
    return (
      <div className="mt-1.5 text-xs rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-green-700 font-medium">
        ✅ Order #{result.order!.id} — {result.order!.customerName}
        {result.phoneMatch && " · Phone ✓"}
        {result.nameMatch && " · Name ✓"}
      </div>
    );
  }
  return (
    <div className="mt-1.5 text-xs rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700 font-medium">
      ❌ Order #{result.order!.id} ({result.order!.customerName}) — phone &amp; name do not match. Cannot save.
    </div>
  );
}
