"use client";

import { useState } from "react";

type TrackResult = {
  trackingNumber: string;
  orderStatus: string;
  customerName?: string;
  address?: string;
  amount?: string | number;
  shippingCharges?: string | number;
  attempts?: number;
  lastUpdate?: string;
  raw?: Record<string, unknown>;
};

const STATUS_COLOR: Record<string, string> = {
  delivered:       "bg-green-100 text-green-800",
  return:          "bg-red-100 text-red-800",
  rto:             "bg-red-100 text-red-800",
  "in transit":    "bg-blue-100 text-blue-800",
  "out for delivery": "bg-violet-100 text-violet-800",
  pending:         "bg-yellow-100 text-yellow-700",
};

function statusColor(s: string) {
  const lower = s.toLowerCase();
  for (const [k, v] of Object.entries(STATUS_COLOR)) {
    if (lower.includes(k)) return v;
  }
  return "bg-gray-100 text-gray-700";
}

export default function OrderStatusClient() {
  const [tracking, setTracking] = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<TrackResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [history, setHistory]   = useState<TrackResult[]>([]);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const t = tracking.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/order-track?tracking=${encodeURIComponent(t)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to fetch status");
      } else {
        setResult(data);
        setHistory((prev) => [data, ...prev.filter((h) => h.trackingNumber !== t)].slice(0, 10));
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  function loadFromHistory(h: TrackResult) {
    setTracking(h.trackingNumber);
    setResult(h);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {/* Search form */}
      <form onSubmit={check} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">Tracking Number</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Order ID daalen (e.g. R-054) ya PostEx CN"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !tracking.trim()}
            className="bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {loading ? "Checking..." : "Check"}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 font-mono">{result.trackingNumber}</p>
              {result.customerName && <p className="text-lg font-bold text-gray-900 mt-0.5">{result.customerName}</p>}
              {result.address && <p className="text-xs text-gray-500 mt-0.5">{result.address}</p>}
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor(result.orderStatus)}`}>
              {result.orderStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {result.amount !== undefined && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Order Amount</p>
                <p className="font-semibold text-gray-800 mt-0.5">Rs. {result.amount}</p>
              </div>
            )}
            {result.shippingCharges !== undefined && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Shipping Charges</p>
                <p className="font-semibold text-gray-800 mt-0.5">Rs. {result.shippingCharges}</p>
              </div>
            )}
            {result.attempts !== undefined && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Delivery Attempts</p>
                <p className="font-semibold text-gray-800 mt-0.5">{result.attempts}</p>
              </div>
            )}
            {result.lastUpdate && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Last Update</p>
                <p className="font-semibold text-gray-800 mt-0.5">{result.lastUpdate}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent lookups */}
      {history.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Lookups</p>
          <div className="space-y-2">
            {history.slice(1).map((h) => (
              <button
                key={h.trackingNumber}
                onClick={() => loadFromHistory(h)}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{h.trackingNumber}</p>
                  {h.customerName && <p className="text-xs text-gray-400">{h.customerName}</p>}
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusColor(h.orderStatus)}`}>
                  {h.orderStatus}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
