"use client";

import { useState, useEffect } from "react";

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

type CheckResult = { total: number; exported: number; pending: number } | null;

export default function RetailExportModal() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(yesterday());
  const [check, setCheck] = useState<CheckResult>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !date) return;
    setCheck(null);
    const controller = new AbortController();
    fetch(`/api/retail/export/check?date=${date}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setCheck(data as CheckResult))
      .catch(() => {});
    return () => controller.abort();
  }, [open, date]);

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/retail/export?from=${date}&to=${date}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Export failed.");
        setLoading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `courier-orders-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      setError("Export failed. Try again.");
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(""); setCheck(null); }}
        className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        ↓ Export Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold">Export to Courier Excel</h2>
              <p className="text-xs text-gray-400 mt-0.5">Select a date to export that day&apos;s orders.</p>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setError(""); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {check && (
              check.exported > 0 && check.pending === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                  ⚠ All {check.total} orders of this date have already been exported.
                </div>
              ) : check.exported > 0 && check.pending > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                  {check.exported} already exported · {check.pending} pending — only pending will be included.
                </div>
              ) : check.total === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-500">
                  No orders found for this date.
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-xs text-green-700">
                  {check.pending} order{check.pending !== 1 ? "s" : ""} ready to export.
                </div>
              )
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={loading || !date || (check !== null && check.pending === 0)}
                className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Exporting…" : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
