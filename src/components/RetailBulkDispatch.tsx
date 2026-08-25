"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OrderItem = { description: string; quantity: number };

type Order = {
  id: number;
  customerName: string;
  phone: string | null;
  city: string | null;
  address: string | null;
  totalAmount: number;
  dispatched: boolean;
  trackingNumber: string | null;
  date: string;
  status: string;
  items: OrderItem[];
  createdByName: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RetailBulkDispatch({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [results, setResults] = useState<Record<number, { tracking?: string; error?: string }>>({});
  const router = useRouter();

  const undispatched = orders.filter(o => !o.dispatched);
  const allIds = undispatched.map(o => o.id);
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id));

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedOrders = orders.filter(o => selected.has(o.id));
  const totalCOD = selectedOrders.reduce((s, o) => s + o.totalAmount, 0);
  const successCount = Object.values(results).filter(r => r.tracking).length;
  const failCount = Object.values(results).filter(r => r.error).length;
  const done = selectedOrders.length > 0 && successCount + failCount === selectedOrders.length;

  async function dispatchAll() {
    setDispatching(true);
    const newResults: Record<number, { tracking?: string; error?: string }> = {};
    for (const order of selectedOrders) {
      try {
        const res = await fetch("/api/retail/postex-dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });
        const data = await res.json();
        newResults[order.id] = data.tracking ? { tracking: data.tracking } : { error: data.error ?? "Unknown error" };
      } catch (e) {
        newResults[order.id] = { error: String(e) };
      }
      setResults({ ...newResults });
    }
    setDispatching(false);
    router.refresh();
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
          <span className="text-sm text-orange-700 font-medium">{selected.size} order{selected.size > 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs text-orange-400 hover:text-orange-700 transition-colors">Clear</button>
            <button
              onClick={() => { setShowModal(true); setResults({}); }}
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

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
              <th className="py-3 pl-4 pr-2 w-8">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={allIds.length === 0} className="rounded border-gray-300 disabled:opacity-30" />
              </th>
              <th className="py-3 px-5">#</th>
              <th className="py-3 px-5">Customer</th>
              <th className="py-3 px-5">Date</th>
              <th className="py-3 px-5">Items</th>
              <th className="py-3 px-5 text-right">Total</th>
              <th className="py-3 px-5 text-right">Dispatch</th>
              <th className="py-3 px-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((o) => {
              const isSelected = selected.has(o.id);
              return (
                <tr key={o.id} className={`hover:bg-gray-50/70 transition-colors ${isSelected ? "bg-orange-50/40" : ""}`}>
                  <td className="py-3 pl-4 pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={o.dispatched}
                      onChange={() => toggle(o.id)}
                      className="rounded border-gray-300 disabled:opacity-20"
                    />
                  </td>
                  <td className="py-3 px-5">
                    <a href={`/retail/orders/${o.id}`} className="font-medium hover:underline text-gray-700">
                      R-{String(o.id).padStart(3, "0")}
                    </a>
                  </td>
                  <td className="py-3 px-5">
                    <p className="font-medium">{o.customerName}</p>
                    {(o.phone || o.city) && <p className="text-xs text-gray-400">{[o.phone, o.city].filter(Boolean).join(" · ")}</p>}
                    {o.createdByName && <p className="text-xs text-blue-400 mt-0.5">{o.createdByName}</p>}
                  </td>
                  <td className="py-3 px-5 text-gray-500">{o.date}</td>
                  <td className="py-3 px-5 text-gray-500 text-xs">{o.items.map(i => `${i.description} ×${i.quantity}`).join(", ")}</td>
                  <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                  <td className="py-3 px-5 text-right">
                    {o.dispatched ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Dispatched</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      (o.status === "PAID" || o.status === "DELIVERED") ? "bg-green-100 text-green-700" :
                      o.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {(o.status === "PAID" || o.status === "DELIVERED") ? "Delivered" : o.status === "PARTIAL" ? "Partial" : "Pending"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Confirm Dispatch</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedOrders.length} order{selectedOrders.length > 1 ? "s" : ""} will be booked on Postex</p>
              </div>
              {!dispatching && <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>}
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {selectedOrders.map(o => {
                const r = results[o.id];
                return (
                  <div key={o.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800">R-{String(o.id).padStart(3, "0")} — {o.customerName}</p>
                      <p className="text-xs text-gray-400">{o.phone ?? "—"} · {o.city ?? "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-gray-700">Rs {fmt(o.totalAmount)}</p>
                      {r?.tracking && <p className="text-xs text-green-600 font-medium">✓ {r.tracking}</p>}
                      {r?.error && <p className="text-xs text-red-500 max-w-[180px] break-words">{r.error}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Total COD</span>
                <span className="font-semibold text-gray-800">Rs {fmt(totalCOD)}</span>
              </div>
              {done && (
                <div className="mb-3 text-xs flex gap-3">
                  {successCount > 0 && <span className="text-green-600 font-medium">✓ {successCount} dispatched</span>}
                  {failCount > 0 && <span className="text-red-500 font-medium">✗ {failCount} failed</span>}
                </div>
              )}
              <div className="flex items-center gap-2 justify-end">
                {done ? (
                  <button onClick={() => setShowModal(false)} className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-black transition-colors">Done</button>
                ) : (
                  <>
                    {!dispatching && <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancel</button>}
                    <button
                      onClick={dispatchAll}
                      disabled={dispatching}
                      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
                    >
                      {dispatching && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {dispatching ? "Booking…" : "Book on Postex"}
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
