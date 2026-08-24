"use client";

import { useRef, useState } from "react";
import {
  applyBulkDispatch,
  previewBulkDispatch,
  type BulkDispatchPreviewRow,
  type BulkDispatchRow,
} from "@/lib/actions";

function parseDispatchCsv(text: string): BulkDispatchRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toUpperCase());
  const refIdx = header.indexOf("ORDER_REFERENCE_NUMBER");
  const trkIdx = header.indexOf("TRACKING_NUMBER");
  if (refIdx === -1 || trkIdx === -1) return [];
  const rows: BulkDispatchRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const slipNo = cols[refIdx];
    const trackingNumber = cols[trkIdx];
    if (slipNo && trackingNumber) rows.push({ slipNo, trackingNumber });
  }
  return rows;
}

export default function BulkDispatchForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BulkDispatchPreviewRow[] | null>(null);
  const [rawRows, setRawRows] = useState<BulkDispatchRow[]>([]);
  const [result, setResult] = useState<{ updated: number; notFound: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(null);
    setResult(null);
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseDispatchCsv(text);
      if (rows.length === 0) {
        setError("No valid rows found — make sure it's the PostEx Order History CSV");
        return;
      }
      setRawRows(rows);
      const p = await previewBulkDispatch(rows);
      setPreview(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!freshRows.length) return;
    setError(null);
    setApplying(true);
    const toApply = rawRows.filter((r) => freshRows.some((f) => f.slipNo === r.slipNo));
    try {
      const res = await applyBulkDispatch(toApply);
      setResult(res);
      setPreview(null);
      setRawRows([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  const foundRows = preview?.filter((r) => r.found) ?? [];
  const notFoundRows = preview?.filter((r) => !r.found) ?? [];
  const freshRows = foundRows.filter((r) => !r.alreadySet);
  const alreadySetRows = foundRows.filter((r) => r.alreadySet);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <label className="text-sm font-medium text-gray-700 mb-2 block">PostEx Order History CSV</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          disabled={loading || applying}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 disabled:opacity-50"
        />
        {loading && <p className="text-sm text-blue-500 mt-2">Reading and matching orders…</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700">Error</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-semibold text-green-700">Dispatch Applied ✓</p>
          <p className="text-sm text-green-600">{result.updated} orders updated with tracking numbers</p>
          {result.notFound > 0 && (
            <p className="text-sm text-yellow-600">{result.notFound} order IDs not found — skipped</p>
          )}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Will Update</p>
              <p className="text-2xl font-bold text-green-700">{freshRows.length}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Already Set</p>
              <p className="text-2xl font-bold text-yellow-600">{alreadySetRows.length}</p>
            </div>
            <div className={`rounded-2xl border p-4 text-center ${notFoundRows.length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="text-xs text-gray-500 mb-1">Not Found</p>
              <p className={`text-2xl font-bold ${notFoundRows.length > 0 ? "text-red-600" : "text-gray-400"}`}>{notFoundRows.length}</p>
            </div>
          </div>

          {/* Will update */}
          {freshRows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Will Be Updated</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                      <th className="py-2 px-4">Order</th>
                      <th className="py-2 px-4">Customer</th>
                      <th className="py-2 px-4">Tracking Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {freshRows.map((r) => (
                      <tr key={r.slipNo}>
                        <td className="py-2 px-4 font-mono text-xs text-gray-500">{r.slipNo}</td>
                        <td className="py-2 px-4 font-medium">{r.customerName}</td>
                        <td className="py-2 px-4 font-mono text-xs text-blue-600">{r.trackingNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Already set */}
          {alreadySetRows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-yellow-50">
                <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Tracking Already Set — Will Be Skipped</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                      <th className="py-2 px-4">Order</th>
                      <th className="py-2 px-4">Customer</th>
                      <th className="py-2 px-4">Tracking Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {alreadySetRows.map((r) => (
                      <tr key={r.slipNo} className="bg-yellow-50">
                        <td className="py-2 px-4 font-mono text-xs text-gray-500">{r.slipNo}</td>
                        <td className="py-2 px-4 font-medium">{r.customerName}</td>
                        <td className="py-2 px-4 font-mono text-xs text-yellow-700">{r.trackingNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Not found */}
          {notFoundRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-xs font-medium text-red-700 mb-2">Not found in retail orders — will be skipped:</p>
              <div className="space-y-1">
                {notFoundRows.map((r) => (
                  <p key={r.slipNo} className="text-xs text-red-600 font-mono">{r.slipNo} → {r.trackingNumber}</p>
                ))}
              </div>
            </div>
          )}

          {freshRows.length > 0 && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full bg-black text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {applying ? "Applying…" : `✓ Apply — Update ${freshRows.length} orders`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
