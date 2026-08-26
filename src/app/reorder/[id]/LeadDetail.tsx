"use client";
import { useState, useTransition } from "react";
import { getLeadCallLogs } from "@/lib/actions";
import { userLabel } from "@/lib/userLabel";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:          { label: "Pending",              color: "text-gray-400" },
  NO_ANSWER:        { label: "No Answer",            color: "text-yellow-600" },
  CALLBACK:         { label: "Callback",             color: "text-blue-600" },
  NOT_INTERESTED:   { label: "Not Interested",       color: "text-red-600" },
  ORDER_PLACED:     { label: "Interested",           color: "text-violet-600" },
  INTERESTED_LATER: { label: "Interested — Not Now", color: "text-orange-500" },
  ORDER_RECEIVED:   { label: "Order Received",       color: "text-green-600" },
};

type CallLog = {
  status: string;
  callNote: string | null;
  calledAt: Date;
  attemptedAt: Date | null;
  openCount: number;
  calledBy: { displayName: string | null; username: string; isAdmin?: boolean };
  phoneCall: { connected: boolean; duration: number; ringDuration: number; callType: string } | null;
};

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type Lead = {
  customerName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  prevItem?: string | null;
};

export default function LeadDetail({ lead, leadId, isAdmin = false }: { lead: Lead; leadId: number; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();

  function openPopup() {
    setOpen(true);
    if (!loaded) {
      startTransition(async () => {
        const logs = await getLeadCallLogs(leadId);
        setCallLogs(logs);
        setLoaded(true);
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPopup}
        className="text-sm font-medium text-gray-800 hover:underline underline-offset-2 text-left leading-tight"
      >
        {lead.customerName}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-gray-900">{lead.customerName}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-2 text-sm">
              <Row icon="📞" label="Phone" value={lead.phone} mono />
              {lead.email    && <Row icon="✉️"  label="Email"   value={lead.email} />}
              {lead.city     && <Row icon="📍" label="City"    value={lead.city} />}
              {lead.address  && <Row icon="🏠" label="Address" value={lead.address} />}
              {lead.prevItem && <Row icon="📦" label="Last Order" value={lead.prevItem} />}
            </div>

            {callLogs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Call History</p>
                <div className="space-y-2">
                  {callLogs.map((log, i) => {
                    const st = STATUS_LABELS[log.status] ?? { label: log.status, color: "text-gray-500" };
                    const date = log.calledAt instanceof Date ? log.calledAt : new Date(log.calledAt);
                    const isNoAnswer = log.status === "NO_ANSWER";
                    const attemptedAt = log.attemptedAt ? new Date(log.attemptedAt) : null;
                    const diffSec = attemptedAt ? Math.floor((date.getTime() - attemptedAt.getTime()) / 1000) : null;
                    const timeSuspicious = isNoAnswer && (diffSec === null || diffSec < 20);

                    const openSuspicious = log.openCount > 1;
                    const phoneMismatch = !!(log.phoneCall && isNoAnswer && log.phoneCall.connected && log.phoneCall.duration > 5);
                    const suspicious = timeSuspicious || openSuspicious || phoneMismatch;
                    return (
                      <div key={i} className={`border rounded-xl p-3 ${suspicious ? "border-red-200 bg-red-50" : "border-gray-100"}`}>
                        {/* Call number + date/time */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-gray-700">Call {i + 1}</span>
                          <span className="text-[11px] text-gray-400">
                            {date.toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                            {" · "}
                            {date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" })}
                          </span>
                        </div>
                        {/* Outcome */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] text-gray-400 shrink-0">Outcome:</span>
                          <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                        </div>
                        {/* Note */}
                        {log.callNote && (
                          <div className="flex items-start gap-1.5 mb-1">
                            <span className="text-[11px] text-gray-400 shrink-0 mt-px">Note:</span>
                            <p className="text-xs text-gray-600 leading-snug">{log.callNote}</p>
                          </div>
                        )}
                        {/* Employee said vs. what the phone's own call log shows */}
                        <div className="flex items-start gap-1.5 mb-1">
                          <span className="text-[11px] text-gray-400 shrink-0 mt-px">📱 Phone:</span>
                          {log.phoneCall ? (
                            <span className={`text-xs font-medium ${phoneMismatch ? "text-red-600" : "text-gray-500"}`}>
                              {log.phoneCall.connected
                                ? `✅ Picked · ${formatSeconds(log.phoneCall.duration)}${phoneMismatch ? " — mismatch! employee logged Not Picked" : ""}`
                                : log.phoneCall.ringDuration > 0
                                ? `📵 Not Picked · rang ${formatSeconds(log.phoneCall.ringDuration)}`
                                : "📵 Not Picked"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">No phone record found</span>
                          )}
                        </div>

                        {/* Attempt audit — admin only */}
                        {isAdmin && (diffSec !== null || isNoAnswer) && (
                          <div className="mt-1.5 space-y-1">
                            {(diffSec !== null || isNoAnswer) && (
                              <div className={`text-[11px] rounded-lg px-2 py-1 flex items-center gap-1 ${timeSuspicious ? "bg-red-100 text-red-700" : "bg-green-50 text-green-700"}`}>
                                {timeSuspicious ? "⚠️" : "✅"}
                                {diffSec === null
                                  ? "No call attempt recorded — possible fake"
                                  : isNoAnswer && diffSec < 20
                                  ? `Only ${diffSec}s between dial & log — suspicious (min: 20s)`
                                  : `${diffSec}s between opening & logging`}
                              </div>
                            )}
                            <div className={`text-[11px] rounded-lg px-2 py-1 flex items-center gap-1 ${openSuspicious ? "bg-red-100 text-red-700" : "bg-green-50 text-green-700"}`}>
                              {openSuspicious ? "⚠️" : "✅"}
                              {log.openCount === 0
                                ? isNoAnswer ? "Log Call not opened — possible fake" : "Log Call not opened"
                                : log.openCount === 1
                                ? "Log Call opened 1 time"
                                : `Log Call opened ${log.openCount} times`}
                            </div>
                          </div>
                        )}
                        <p className="text-[11px] text-gray-300 mt-1">by {userLabel(log.calledBy)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="w-full border border-gray-200 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 mt-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-gray-700 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
