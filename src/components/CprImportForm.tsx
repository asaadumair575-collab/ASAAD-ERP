"use client";

import { useRef, useState } from "react";
import { applyCPR, parseCPRText_action, type CPRRow } from "@/lib/actions";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function CprImportForm() {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState<CPRRow[]>([]);
  const [result, setResult] = useState<{ payments: number; returned: number; notFound: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);

  function handleParse() {
    const text = textRef.current?.value?.trim();
    if (!text) return;
    setResult(null);
    setError(null);
    setRows([]);
    setParsing(true);
    parseCPRText_action(text)
      .then((parsed) => {
        if (parsed.length === 0) {
          setError("Koi orders nahi mile. Text check karo — pura CPR copy hua hai?");
        } else {
          setRows(parsed);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setParsing(false));
  }

  function handleApply() {
    setError(null);
    setApplying(true);
    applyCPR(rows)
      .then((res) => {
        setResult(res);
        setRows([]);
        if (textRef.current) textRef.current.value = "";
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setApplying(false));
  }

  const delivered = rows.filter((r) => r.status === "Delivered");
  const returned = rows.filter((r) => r.status === "Return");

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">CPR PDF Text</p>
          <p className="text-xs text-gray-400">PostEx CPR PDF kholein → Ctrl+A (sab select) → Ctrl+C (copy) → yahan paste karein</p>
        </div>
        <textarea
          ref={textRef}
          rows={6}
          placeholder="CPR ka text yahan paste karein..."
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black resize-none"
        />
        <button
          onClick={handleParse}
          disabled={parsing}
          className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {parsing ? "Parse ho raha hai..." : "Parse CPR"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700">Error</p>
          <p className="text-xs text-red-600 mt-1 break-all">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-semibold text-green-700">CPR apply ho gaya ✓</p>
          <p className="text-sm text-green-600">{result.payments} orders pe payment record hui · {result.returned} orders returned mark hue</p>
          {result.notFound > 0 && <p className="text-sm text-yellow-600">{result.notFound} tracking numbers system mein nahi mile (skip)</p>}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Delivered</p>
              <p className="text-xl font-bold text-green-700">{delivered.length}</p>
              <p className="text-xs text-green-600 mt-0.5">Rs {fmt(delivered.reduce((s, r) => s + r.netAmount, 0))} milenge</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Returned</p>
              <p className="text-xl font-bold text-red-600">{returned.length}</p>
              <p className="text-xs text-red-500 mt-0.5">Rs {fmt(returned.reduce((s, r) => s + r.shippingCharges, 0))} shipping cost</p>
            </div>
          </div>

          {delivered.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Delivered — Payment Record Hogi</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                    <th className="py-2 px-4">Tracking</th>
                    <th className="py-2 px-4 text-right">COD</th>
                    <th className="py-2 px-4 text-right">Shipping</th>
                    <th className="py-2 px-4 text-right">Net (Payment)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {delivered.map((r) => (
                    <tr key={r.trackingNumber}>
                      <td className="py-2 px-4 font-mono text-xs text-gray-600">{r.trackingNumber}</td>
                      <td className="py-2 px-4 text-right tabular-nums">Rs {fmt(r.codAmount)}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-400">− Rs {fmt(r.shippingCharges)}</td>
                      <td className="py-2 px-4 text-right tabular-nums font-semibold text-green-700">Rs {fmt(r.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {returned.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Returned — Return Mark + Shipping Cost Save Hogi</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                    <th className="py-2 px-4">Tracking</th>
                    <th className="py-2 px-4 text-right">Return Shipping Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {returned.map((r) => (
                    <tr key={r.trackingNumber}>
                      <td className="py-2 px-4 font-mono text-xs text-gray-600">{r.trackingNumber}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-red-600 font-medium">Rs {fmt(r.shippingCharges)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {applying ? "Apply ho raha hai..." : `Apply CPR (${rows.length} orders)`}
          </button>
        </div>
      )}
    </div>
  );
}
