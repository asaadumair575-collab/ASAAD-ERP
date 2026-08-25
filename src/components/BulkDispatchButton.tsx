"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OrderSummary = {
  id: number;
  customerName: string;
  phone: string | null;
  city: string | null;
  totalAmount: number;
  notes: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function BulkDispatchButton({
  selectedIds,
  orders,
}: {
  selectedIds: number[];
  orders: OrderSummary[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: number; tracking?: string; error?: string }[] | null>(null);
  const router = useRouter();

  const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
  const totalCOD = selectedOrders.reduce((s, o) => s + o.totalAmount, 0);

  async function dispatch() {
    if (!selectedIds.length || loading) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/ecom/postex-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      setResults(data.results ?? [{ id: 0, error: data.error ?? "Unknown error" }]);
    } catch (e) {
      setResults([{ id: 0, error: String(e) }]);
    }
    setLoading(false);
    router.refresh();
  }

  const success = results?.filter(r => r.tracking && !r.error).length ?? 0;
  const failed  = results?.filter(r => r.error).length ?? 0;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => { setShowModal(true); setResults(null); }}
        disabled={!selectedIds.length}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <path d="M2 8h9M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Dispatch via Postex ({selectedIds.length})
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Confirm Dispatch</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedOrders.length} order{selectedOrders.length > 1 ? "s" : ""} will be booked on Postex</p>
              </div>
              <button onClick={() => { setShowModal(false); setResults(null); }} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
            </div>

            {/* Order list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {selectedOrders.map(o => {
                const label = o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`;
                const result = results?.find(r => r.id === o.id);
                return (
                  <div key={o.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{label} — {o.customerName}</p>
                      <p className="text-xs text-gray-400">{o.phone ?? "—"} · {o.city ?? "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-gray-700">Rs {fmt(o.totalAmount)}</p>
                      {result?.tracking && (
                        <p className="text-xs text-green-600 font-medium">✓ {result.tracking}</p>
                      )}
                      {result?.error && (
                        <p className="text-xs text-red-500 max-w-[160px] truncate" title={result.error}>✗ {result.error}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              {/* Summary totals */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Total COD to collect</span>
                <span className="font-semibold text-gray-800">Rs {fmt(totalCOD)}</span>
              </div>

              {/* Results summary */}
              {results && (
                <div className="mb-3 text-xs flex gap-3">
                  {success > 0 && <span className="text-green-600 font-medium">✓ {success} dispatched successfully</span>}
                  {failed > 0 && <span className="text-red-500 font-medium">✗ {failed} failed — check errors above</span>}
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                {!results && (
                  <button onClick={() => setShowModal(false)} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg transition-colors">
                    Cancel
                  </button>
                )}
                {results ? (
                  <button onClick={() => setShowModal(false)} className="text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-black transition-colors">
                    Done
                  </button>
                ) : (
                  <button
                    onClick={dispatch}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
                  >
                    {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? `Booking ${selectedIds.length} order${selectedIds.length > 1 ? "s" : ""}…` : "Book on Postex"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
