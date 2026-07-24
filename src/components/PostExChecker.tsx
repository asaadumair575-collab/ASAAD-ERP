"use client";

import { useState } from "react";

type Order = { id: number; customerName: string; trackingNumber: string | null; totalAmount: number };
type Result = { tracking: string; orderId: number; customer: string; amount: number; status: string; shippingCharges: number; isReturn: boolean; error?: string };

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function PostExChecker({
  orders,
  markReturnedAction,
}: {
  orders: Order[];
  markReturnedAction: (id: number, fd: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [marking, setMarking] = useState<number | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set());

  async function checkAll() {
    setLoading(true);
    setResults([]);
    const res = await fetch("/api/postex-sync?preview=1", { method: "POST" });
    const json = await res.json();
    setResults(json.results ?? []);
    setLoading(false);
  }

  async function markReturned(orderId: number) {
    setMarking(orderId);
    const fd = new FormData();
    fd.set("returned", "true");
    await markReturnedAction(orderId, fd);
    setMarked((prev) => new Set([...prev, orderId]));
    setMarking(null);
  }

  const returnOrders = results.filter((r) => r.isReturn && !marked.has(r.orderId));
  const deliveredOrders = results.filter((r) => !r.isReturn && !r.error);
  const errorOrders = results.filter((r) => r.error);

  return (
    <div className="space-y-4">
      {/* Pending orders list */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{orders.length} Pending Orders (with tracking)</p>
          <button
            onClick={checkAll}
            disabled={loading || orders.length === 0}
            className="bg-orange-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check All on PostEx"}
          </button>
        </div>
        {orders.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Koi pending order nahi with tracking number</p>
        )}
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {orders.map((o) => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{o.customerName}</p>
                <p className="text-xs font-mono text-gray-400">{o.trackingNumber}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">Rs {fmt(o.totalAmount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {/* Returns */}
          {returnOrders.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-red-100">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">{returnOrders.length} Returned</p>
              </div>
              <div className="divide-y divide-red-50">
                {returnOrders.map((r) => (
                  <div key={r.orderId} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.customer}</p>
                      <p className="text-xs font-mono text-gray-400">{r.tracking}</p>
                      <p className="text-xs text-red-500 mt-0.5">{r.status} · Ship: Rs {fmt(r.shippingCharges)}</p>
                    </div>
                    {marked.has(r.orderId) ? (
                      <span className="text-xs font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">✓ Marked</span>
                    ) : (
                      <button
                        onClick={() => markReturned(r.orderId)}
                        disabled={marking === r.orderId}
                        className="bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {marking === r.orderId ? "..." : "Mark Returned"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivered */}
          {deliveredOrders.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-green-100">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">{deliveredOrders.length} Delivered</p>
              </div>
              <div className="divide-y divide-green-50">
                {deliveredOrders.map((r) => (
                  <div key={r.orderId} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.customer}</p>
                      <p className="text-xs font-mono text-gray-400">{r.tracking}</p>
                    </div>
                    <span className="text-xs text-green-600 font-medium">{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {errorOrders.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{errorOrders.length} Not Found / Error</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {errorOrders.map((r) => (
                  <div key={r.orderId} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{r.customer}</p>
                      <p className="text-xs font-mono text-gray-300">{r.tracking}</p>
                    </div>
                    <p className="text-xs text-gray-400">{r.error?.slice(0, 40)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
