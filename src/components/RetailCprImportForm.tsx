"use client";

import { useRef, useState } from "react";
import { applyRetailCPR, previewRetailCPR, type CPRRow, type RetailCPRPreviewRow } from "@/lib/actions";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RetailCprImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawRows, setRawRows] = useState<CPRRow[]>([]);
  const [preview, setPreview] = useState<RetailCPRPreviewRow[] | null>(null);
  const [result, setResult] = useState<{ payments: number; returned: number; notFound: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    reset();
    setParsing(true);
    const allRows: CPRRow[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Reading file ${i + 1} of ${files.length}...`);
        const fd = new FormData();
        fd.append("cpr", files[i]);
        const res = await fetch("/api/cpr", { method: "POST", body: fd });
        const body = await res.json();
        if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
        allRows.push(...(body as CPRRow[]));
      }
      const seen = new Map<string, CPRRow>();
      for (const r of allRows) seen.set(r.trackingNumber, r);
      const merged = [...seen.values()];
      if (merged.length === 0) { setError("No orders found in PDF — check the file"); return; }
      setRawRows(merged);
      setProgress(null);
      setMatching(true);
      const matched = await previewRetailCPR(merged);
      setPreview(matched);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsing(false);
      setMatching(false);
      setProgress(null);
    }
  }

  function handleApply() {
    if (!rawRows.length) return;
    setError(null);
    setApplying(true);
    applyRetailCPR(rawRows)
      .then((res) => {
        setResult(res);
        setPreview(null);
        setRawRows([]);
        if (fileRef.current) fileRef.current.value = "";
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setApplying(false));
  }

  function reset() {
    setRawRows([]);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  const foundRows = preview?.filter((r) => r.found) ?? [];
  const notFoundRows = preview?.filter((r) => !r.found) ?? [];
  const deliveredFound = foundRows.filter((r) => r.status === "Delivered");
  const returnedFound = foundRows.filter((r) => r.status === "Return");

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <label className="text-sm font-medium text-gray-700 mb-2 block">PostEx CPR PDF</label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFile}
          disabled={parsing || matching || applying}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 disabled:opacity-50"
        />
        {progress && <p className="text-sm text-gray-400 mt-2">{progress}</p>}
        {matching && <p className="text-sm text-blue-500 mt-2">Matching with retail orders...</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700">Error</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-semibold text-green-700">CPR Applied ✓</p>
          <p className="text-sm text-green-600">{result.payments} orders settled · {result.returned} orders marked returned</p>
          {result.notFound > 0 && <p className="text-sm text-yellow-600">{result.notFound} tracking numbers not found in retail orders</p>}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Delivered</p>
              <p className="text-2xl font-bold text-green-700">{deliveredFound.length}</p>
              <p className="text-xs text-green-600 mt-0.5">Rs {fmt(deliveredFound.reduce((s, r) => s + r.netReceivable, 0))} net</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Returned</p>
              <p className="text-2xl font-bold text-red-600">{returnedFound.length}</p>
            </div>
            <div className={`rounded-2xl border p-4 text-center ${notFoundRows.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="text-xs text-gray-500 mb-1">Not Found</p>
              <p className={`text-2xl font-bold ${notFoundRows.length > 0 ? "text-yellow-600" : "text-gray-400"}`}>{notFoundRows.length}</p>
            </div>
          </div>

          {/* Delivered */}
          {deliveredFound.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Delivered — Will Be Settled</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                      <th className="py-2 px-4">Order</th>
                      <th className="py-2 px-4">Customer</th>
                      <th className="py-2 px-4 text-right">COD</th>
                      <th className="py-2 px-4 text-right">Courier Charge</th>
                      <th className="py-2 px-4 text-right">Net Receive</th>
                      <th className="py-2 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deliveredFound.map((r) => (
                      <tr key={r.trackingNumber} className={r.alreadyProcessed ? "bg-yellow-50" : ""}>
                        <td className="py-2 px-4 font-mono text-xs text-gray-500">{r.slipNo ?? r.trackingNumber}</td>
                        <td className="py-2 px-4 font-medium">{r.customerName}</td>
                        <td className="py-2 px-4 text-right tabular-nums text-gray-500">Rs {fmt(r.codAmount)}</td>
                        <td className="py-2 px-4 text-right tabular-nums text-red-500">− Rs {fmt(r.courierCharge)}</td>
                        <td className="py-2 px-4 text-right tabular-nums font-semibold text-green-700">Rs {fmt(r.netReceivable)}</td>
                        <td className="py-2 px-4 text-right">
                          {r.alreadyProcessed && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Already settled</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Returned */}
          {returnedFound.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Returned — Will Be Marked as Returned</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                    <th className="py-2 px-4">Order</th>
                    <th className="py-2 px-4">Customer</th>
                    <th className="py-2 px-4 text-right">Return Shipping Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {returnedFound.map((r) => (
                    <tr key={r.trackingNumber} className={r.alreadyProcessed ? "bg-yellow-50" : ""}>
                      <td className="py-2 px-4 font-mono text-xs text-gray-500">{r.slipNo ?? r.trackingNumber}</td>
                      <td className="py-2 px-4 font-medium">{r.customerName}</td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium text-red-600">Rs {fmt(r.shippingCharges)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Not found */}
          {notFoundRows.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="text-xs font-medium text-yellow-700 mb-2">Not found in retail orders — will be skipped:</p>
              <div className="space-y-1">
                {notFoundRows.map((r) => (
                  <p key={r.trackingNumber} className="text-xs text-yellow-600 font-mono">{r.trackingNumber} ({r.status})</p>
                ))}
              </div>
            </div>
          )}

          {foundRows.length > 0 && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full bg-black text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {applying ? "Applying…" : `✓ Apply — ${deliveredFound.length} settle, ${returnedFound.length} return`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
