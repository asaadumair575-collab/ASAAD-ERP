"use client";

import { useRef, useState, useTransition } from "react";
import { parseCPRPDF, applyCPR, type CPRRow } from "@/lib/actions";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function CprImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CPRRow[]>([]);
  const [result, setResult] = useState<{ payments: number; returned: number; notFound: number } | null>(null);
  const [parsing, startParsing] = useTransition();
  const [applying, startApplying] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("cpr", file);
    setResult(null);
    startParsing(async () => {
      const parsed = await parseCPRPDF(fd);
      setRows(parsed);
    });
  }

  function handleApply() {
    startApplying(async () => {
      const res = await applyCPR(rows);
      setResult(res);
      setRows([]);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  const delivered = rows.filter((r) => r.status === "Delivered");
  const returned = rows.filter((r) => r.status === "Return");

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <label className="text-sm font-medium text-gray-700 mb-2 block">CPR PDF File</label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleFile}
          disabled={parsing}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 disabled:opacity-50"
        />
        {parsing && <p className="text-sm text-gray-400 mt-2">PDF parse ho raha hai...</p>}
      </div>

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
