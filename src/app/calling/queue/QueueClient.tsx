"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignNextCallingLead, logCallingResult, releaseCallingLead } from "@/lib/actions";

type Lead = {
  id: number;
  customerName: string;
  phone: string;
  city: string | null;
  sourceType: string;
  prevItem: string | null;
  lastOrderDate: Date | null;
  noAnswerCount: number;
  callRecords: {
    id: number;
    status: string;
    note: string | null;
    calledAt: Date;
    calledBy: { displayName: string | null; username: string };
  }[];
};

const STATUSES = [
  { value: "ORDER_CONFIRMED",    label: "✅ Order Confirmed",     color: "bg-green-50 border-green-400 text-green-700" },
  { value: "INTERESTED",         label: "👍 Interested",          color: "bg-violet-50 border-violet-400 text-violet-700" },
  { value: "FOLLOW_UP_REQUIRED", label: "📅 Follow-up Required", color: "bg-blue-50 border-blue-400 text-blue-700" },
  { value: "NOT_INTERESTED",     label: "❌ Not Interested",      color: "bg-red-50 border-red-300 text-red-600" },
  { value: "NO_ANSWER",          label: "📵 No Answer",           color: "bg-yellow-50 border-yellow-300 text-yellow-700" },
  { value: "BUSY",               label: "🔴 Busy",                color: "bg-orange-50 border-orange-300 text-orange-600" },
  { value: "WRONG_NUMBER",       label: "⛔ Wrong Number",        color: "bg-gray-100 border-gray-300 text-gray-600" },
];

const SOURCE_LABELS: Record<string, string> = {
  RETAIL_ADVANCE: "Retail Advance",
  COD:            "COD",
  REORDER:        "Reorder Campaign",
  SHOPIFY:        "Shopify",
  MANUAL:         "Manual",
};

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export function EmptyQueue({ pendingCount }: { pendingCount: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function getNext() {
    startTransition(async () => {
      await assignNextCallingLead();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-8">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl">📞</div>
      {pendingCount > 0 ? (
        <>
          <div>
            <p className="text-lg font-semibold text-gray-800">Queue Ready</p>
            <p className="text-sm text-gray-400 mt-1">{pendingCount} lead{pendingCount !== 1 ? "s" : ""} waiting</p>
          </div>
          <button
            onClick={getNext}
            disabled={pending}
            className="bg-black text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors text-sm"
          >
            {pending ? "Assigning..." : "Start Calling →"}
          </button>
        </>
      ) : (
        <div>
          <p className="text-lg font-semibold text-gray-800">Queue Empty</p>
          <p className="text-sm text-gray-400 mt-1">Koi aur lead abhi available nahi</p>
        </div>
      )}
    </div>
  );
}

export function QueueCard({ lead }: { lead: Lead }) {
  const [status, setStatus] = useState("");
  const [note, setNote]     = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const needsFollowUp = status === "INTERESTED" || status === "FOLLOW_UP_REQUIRED";
  const canSave = !!status && (!needsFollowUp || !!followUpAt);

  function submit() {
    if (!canSave) return;
    startTransition(async () => {
      await logCallingResult(lead.id, status, note.trim() || undefined, followUpAt || undefined);
      setStatus("");
      setNote("");
      setFollowUpAt("");
      router.refresh();
    });
  }

  function skip() {
    startTransition(async () => {
      await releaseCallingLead(lead.id);
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      {/* Lead card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        {/* Source badge */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {SOURCE_LABELS[lead.sourceType] ?? lead.sourceType}
          </span>
          {lead.noAnswerCount > 0 && (
            <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full">
              📵 {lead.noAnswerCount}× no answer
            </span>
          )}
        </div>

        {/* Customer info */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{lead.customerName}</h2>
          {lead.city && <p className="text-sm text-gray-400">{lead.city}</p>}
        </div>

        <a
          href={`tel:${lead.phone}`}
          className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-xl px-5 py-3 transition-colors w-full justify-center"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <span className="font-bold tracking-wide">{lead.phone}</span>
        </a>

        {/* Extra info */}
        {(lead.prevItem || lead.lastOrderDate) && (
          <div className="text-xs text-gray-500 space-y-0.5 bg-gray-50 rounded-xl p-3">
            {lead.prevItem && <p>📦 Last product: <span className="font-medium text-gray-700">{lead.prevItem}</span></p>}
            {lead.lastOrderDate && <p>🗓 Last order: <span className="font-medium text-gray-700">{new Date(lead.lastOrderDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" })}</span></p>}
          </div>
        )}

        {/* Call history toggle */}
        {lead.callRecords.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            {showHistory ? "Hide" : "Show"} call history ({lead.callRecords.length})
          </button>
        )}
        {showHistory && (
          <div className="space-y-2">
            {lead.callRecords.map((r) => (
              <div key={r.id} className="text-xs bg-gray-50 rounded-xl p-3 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">{r.calledBy.displayName ?? r.calledBy.username}</span>
                  <span className="text-gray-400">{fmt(r.calledAt)}</span>
                </div>
                <p className="text-gray-500">{r.status.replace(/_/g, " ")}{r.note ? ` — ${r.note}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Result section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Call Result <span className="text-red-500">*</span></p>

        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatus(s.value); if (s.value !== "INTERESTED" && s.value !== "FOLLOW_UP_REQUIRED") setFollowUpAt(""); }}
              className={`border rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition-colors ${
                status === s.value
                  ? s.color + " ring-2 ring-offset-1 ring-current"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {needsFollowUp && (
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Follow-up Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Koi baat ho to likhein..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={pending || !canSave}
            className="flex-1 bg-black text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {pending ? "Saving..." : "Save & Next →"}
          </button>
          <button
            onClick={skip}
            disabled={pending}
            title="Release this lead back to queue"
            className="border border-gray-200 text-xs text-gray-400 px-3 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
