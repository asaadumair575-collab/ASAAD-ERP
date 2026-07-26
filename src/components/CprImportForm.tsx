"use client";

import { useRef, useState } from "react";
import { applyCPR, previewCPR, type CPRRow, type CPRPreviewRow } from "@/lib/actions";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function CprImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawRows, setRawRows] = useState<CPRRow[]>([]);
  const [preview, setPreview] = useState<CPRPreviewRow[] | null>(null);
  const [result, setResult] = useState<{ payments: number; returned: number; notFound: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [applying, setApplying] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setParsing(true);

    const fd = new FormData();
    fd.append("cpr", file);

    fetch("/api/cpr", { method: "POST", body: fd })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
        return body as CPRRow[];
      })
      .then(async (parsed) => {
        if (parsed.length === 0) { setError("No orders found in PDF — check the file"); return; }
        setRawRows(parsed);
        setMatching(true);
        const matched = await previewCPR(parsed);
        setPreview(matched);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => { setParsing(false); setMatching(false); });
  }

  function handleApply() {
    if (!rawRows.length) return;
    setError(null);
    setApplying(true);
    applyCPR(rawRows)
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
        <label className="text-sm font-medium text-gray-700 mb-2 block">CPR PDF File</label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleFile}
          disabled={parsing || matching || applying}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 disabled:opacity-50"
        />
        {parsing && <p className="text-sm text-gray-400 mt-2">Reading PDF...</p>}
        {matching && <p className="text-sm text-blue-500 mt-2">Matching orders in system...</p>}
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
          {result.notFound > 0 && (
            <p className="text-sm text-yellow-600">{result.notFound} tracking numbers not found in system</p>
          )}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Delivered</p>
              <p className="text-2xl font-bold text-green-700">{deliveredFound.length}</p>
              <p className="text-xs text-green-600 mt-0.5">Rs {fmt(deliveredFound.reduce((s, r) => s + r.netAmount, 0))} settle</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Returned</p>
              <p className="text-2xl font-bold text-red-600">{returnedFound.length}</p>
              <p className="text-xs text-red-500 mt-0.5">Rs {fmt(returnedFound.reduce((s, r) => s + r.shippingCharges, 0))} shipping</p>
            </div>
            <div className={`rounded-2xl border p-4 text-center ${notFoundRows.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="text-xs text-gray-500 mb-1">Not Found</p>
              <p className={`text-2xl font-bold ${notFoundRows.length > 0 ? "text-yellow-600" : "text-gray-400"}`}>{notFoundRows.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">not in system</p>
            </div>
          </div>

          {/* Delivered orders */}
          {deliveredFound.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Delivered — Payment Will Be Settled</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                      <th className="py-2 px-4">Tracking</th>
                      <th className="py-2 px-4">Customer</th>
                      <th className="py-2 px-4 text-right">COD</th>
                      <th className="py-2 px-4 text-right">Shipping</th>
                      <th className="py-2 px-4 text-right">Net (Receive)</th>
                      <th className="py-2 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deliveredFound.map((r) => (
                      <tr key={r.trackingNumber} className={r.alreadyProcessed ? "bg-yellow-50" : ""}>
                        <td className="py-2 px-4 font-mono text-xs text-gray-600">{r.trackingNumber}</td>
                        <td className="py-2 px-4 font-medium text-gray-700">E-{String(r.orderId).padStart(3, "0")} · {r.customerName}</td>
                        <td className="py-2 px-4 text-right tabular-nums text-gray-500">Rs {fmt(r.codAmount)}</td>
                        <td className="py-2 px-4 text-right tabular-nums text-red-400">− Rs {fmt(r.codAmount - r.netAmount)}</td>
                        <td className="py-2 px-4 text-right tabular-nums font-semibold text-green-700">Rs {fmt(r.netAmount)}</td>
                        <td className="py-2 px-4 text-right">
                          {r.alreadyProcessed && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Already settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Returned orders */}
          {returnedFound.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Returned — Will Be Marked as Returned</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                      <th className="py-2 px-4">Tracking</th>
                      <th className="py-2 px-4">Customer</th>
                      <th className="py-2 px-4 text-right">Return Shipping Cost</th>
                      <th className="py-2 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {returnedFound.map((r) => (
                      <tr key={r.trackingNumber} className={r.alreadyProcessed ? "bg-yellow-50" : ""}>
                        <td className="py-2 px-4 font-mono text-xs text-gray-600">{r.trackingNumber}</td>
                        <td className="py-2 px-4 font-medium text-gray-700">E-{String(r.orderId).padStart(3, "0")} · {r.customerName}</td>
                        <td className="py-2 px-4 text-right tabular-nums font-medium text-red-600">Rs {fmt(r.shippingCharges)}</td>
                        <td className="py-2 px-4 text-right">
                          {r.alreadyProcessed && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Already returned</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Not found orders */}
          {notFoundRows.length > 0 && (
            <div className="bg-white border border-yellow-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-yellow-100 bg-yellow-50">
                <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Not Found in System — Will Be Skipped</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                      <th className="py-2 px-4">Tracking</th>
                      <th className="py-2 px-4">Status</th>
                      <th className="py-2 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {notFoundRows.map((r) => (
                      <tr key={r.trackingNumber} className="opacity-60">
                        <td className="py-2 px-4 font-mono text-xs text-gray-600">{r.trackingNumber}</td>
                        <td className="py-2 px-4">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "Return" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right tabular-nums text-gray-400">Rs {fmt(r.status === "Return" ? r.shippingCharges : r.netAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {foundRows.length > 0 && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {applying ? "Applying..." : `Apply CPR — ${deliveredFound.length} settle, ${returnedFound.length} return`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
