"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CallLogButton from "./CallLogButton";

type Lead = {
  id: number;
  customerName: string;
  phone: string;
  city: string | null;
  address: string | null;
  status: string;
  callNote: string | null;
  postexTrackingNumber: string | null;
  prevItem: string | null;
  calledAt: string | null;
  calledByName: string | null;
  callLogsCount: number;
};

type Me = { id: number; displayName: string | null; isAdmin?: boolean };

const STATUS_LABELS: Record<string, { label: string; short: string; color: string; dot: string }> = {
  PENDING:          { label: "Pending",              short: "Pending",    color: "bg-gray-100 text-gray-500",     dot: "bg-gray-400" },
  NO_ANSWER:        { label: "No Answer",            short: "No Answer",  color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  CALLBACK:         { label: "Callback",             short: "Callback",   color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500" },
  NOT_INTERESTED:   { label: "Not Interested",       short: "Not Int.",   color: "bg-red-100 text-red-600",       dot: "bg-red-500" },
  ORDER_PLACED:     { label: "Interested",           short: "Interested", color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  INTERESTED_LATER: { label: "Interested — Not Now", short: "Int. Later", color: "bg-orange-100 text-orange-600", dot: "bg-orange-400" },
  ORDER_RECEIVED:   { label: "Order Received",       short: "Ordered",    color: "bg-green-100 text-green-700",   dot: "bg-green-500" },
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RetailLeadsTable({ leads, me }: { leads: Lead[]; me: Me }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [results, setResults] = useState<Record<number, { tracking?: string; error?: string }>>({});
  const router = useRouter();

  const dispatchable = leads.filter(l => l.status === "ORDER_RECEIVED" && !l.postexTrackingNumber);
  const allDispatchableIds = dispatchable.map(l => l.id);
  const allChecked = allDispatchableIds.length > 0 && allDispatchableIds.every(id => selected.has(id));

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(allDispatchableIds));
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedLeads = leads.filter(l => selected.has(l.id));
  const totalCOD = selectedLeads.reduce((s, l) => s + (Number(amounts[l.id]) || 0), 0);
  const successCount = Object.values(results).filter(r => r.tracking).length;
  const failCount    = Object.values(results).filter(r => r.error).length;
  const done = successCount + failCount === selectedLeads.length && selectedLeads.length > 0;

  async function dispatchAll() {
    setDispatching(true);
    const newResults: Record<number, { tracking?: string; error?: string }> = {};
    for (const lead of selectedLeads) {
      try {
        const res = await fetch("/api/reorder/postex-dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id, amount: Number(amounts[lead.id]) || 0 }),
        });
        const data = await res.json();
        newResults[lead.id] = data.tracking ? { tracking: data.tracking } : { error: data.error ?? "Unknown error" };
      } catch (e) {
        newResults[lead.id] = { error: String(e) };
      }
      setResults({ ...newResults });
    }
    setDispatching(false);
    router.refresh();
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 mb-3">
          <span className="text-sm text-orange-700 font-medium">{selected.size} order{selected.size > 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs text-orange-400 hover:text-orange-700 transition-colors">Clear</button>
            <button
              onClick={() => { setShowDispatch(true); setResults({}); }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M2 8h9M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Dispatch via Postex ({selected.size})
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto isolate">
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No leads match the filter</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-3 pl-4 pr-2 w-8">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    disabled={allDispatchableIds.length === 0}
                    className="rounded border-gray-300 disabled:opacity-30"
                  />
                </th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">#</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Phone</th>
                <th className="py-3 px-4 text-left hidden md:table-cell">City</th>
                <th className="py-3 px-4 text-left hidden lg:table-cell">Last Order</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Status</th>
                <th className="py-3 px-4 text-left sticky right-0 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l, i) => {
                const isNumberOff = l.status === "NO_ANSWER" && (l.callNote ?? "").toLowerCase().includes("number closed");
                const st = isNumberOff
                  ? { label: "Number Off", short: "Num Off", color: "bg-red-200 text-red-800", dot: "bg-red-600" }
                  : (STATUS_LABELS[l.status] ?? STATUS_LABELS.PENDING);
                const canSelect = l.status === "ORDER_RECEIVED" && !l.postexTrackingNumber;
                const isSelected = selected.has(l.id);
                return (
                  <tr key={l.id} className={`hover:bg-gray-50/60 transition-colors ${isSelected ? "bg-orange-50/40" : ""}`}>
                    <td className="py-2.5 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!canSelect}
                        onChange={() => toggle(l.id)}
                        className="rounded border-gray-300 disabled:opacity-20"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-gray-300 text-xs hidden sm:table-cell">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-gray-800">{l.customerName}</span>
                        <span className={`sm:hidden inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.short}
                        </span>
                        {l.calledByName && (
                          <span className="text-[11px] text-gray-400 leading-none">
                            · {l.calledByName}
                            {l.calledAt && <span className="text-gray-300"> · {new Date(l.calledAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 text-xs hidden sm:table-cell">{l.phone}</td>
                    <td className="py-2.5 px-4 text-gray-400 text-xs hidden md:table-cell">{l.city || "—"}</td>
                    <td className="py-2.5 px-4 text-gray-300 text-xs truncate max-w-[140px] hidden lg:table-cell">{l.prevItem || "—"}</td>
                    <td className="py-2.5 px-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${st.color}`}>
                          {st.label}
                        </span>
                        {l.postexTrackingNumber && (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                            📦 {l.postexTrackingNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 sticky right-0 bg-inherit">
                      <CallLogButton
                        lead={{ id: l.id, customerName: l.customerName, phone: l.phone, status: l.status, callNote: l.callNote ?? "", city: l.city, address: l.address, postexTrackingNumber: l.postexTrackingNumber }}
                        me={me}
                        callCount={l.callLogsCount}
                        simplified
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bulk Dispatch Modal */}
      {showDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Confirm Dispatch</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedLeads.length} order{selectedLeads.length > 1 ? "s" : ""} — enter COD amount per order</p>
              </div>
              {!dispatching && (
                <button onClick={() => setShowDispatch(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {selectedLeads.map(l => {
                const r = results[l.id];
                return (
                  <div key={l.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{l.customerName}</p>
                      <p className="text-xs text-gray-400">{l.phone} · {l.city ?? "—"}</p>
                    </div>
                    <div className="shrink-0 w-28">
                      {!r ? (
                        <input
                          type="number"
                          value={amounts[l.id] ?? ""}
                          onChange={e => setAmounts(prev => ({ ...prev, [l.id]: e.target.value }))}
                          placeholder="Rs amount"
                          disabled={dispatching}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      ) : r.tracking ? (
                        <p className="text-xs text-green-600 font-medium">✓ {r.tracking}</p>
                      ) : (
                        <p className="text-xs text-red-500 break-words">{r.error}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              {totalCOD > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>Total COD</span>
                  <span className="font-semibold text-gray-800">Rs {fmt(totalCOD)}</span>
                </div>
              )}
              {done && (
                <div className="mb-3 text-xs flex gap-3">
                  {successCount > 0 && <span className="text-green-600 font-medium">✓ {successCount} dispatched</span>}
                  {failCount > 0 && <span className="text-red-500 font-medium">✗ {failCount} failed</span>}
                </div>
              )}
              <div className="flex items-center gap-2 justify-end">
                {done ? (
                  <button onClick={() => setShowDispatch(false)} className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-black transition-colors">
                    Done
                  </button>
                ) : (
                  <>
                    {!dispatching && (
                      <button onClick={() => setShowDispatch(false)} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg transition-colors">
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={dispatchAll}
                      disabled={dispatching}
                      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
                    >
                      {dispatching && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {dispatching ? "Booking…" : "Book All on Postex"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
