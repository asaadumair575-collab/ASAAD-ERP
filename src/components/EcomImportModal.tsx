"use client";

import { useRef, useState, useTransition } from "react";
import { importEcomOrdersFromCSV } from "@/lib/actions";

type ParsedRow = {
  customerName: string;
  phone: string | null;
  city: string | null;
  trackingNumber: string | null;
  totalAmount: number;
  date: Date;
  description: string;
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  const idx = (name: string) => header.findIndex((h) => h === name);
  const iName = idx("CUSTOMER_NAME");
  const iPhone = idx("CUSTOMER_PHONE");
  const iCity = idx("CITY_NAME");
  const iTracking = idx("TRACKING_NUMBER");
  const iAmount = idx("INVOICE_PAYMENT");
  const iDate = idx("TRANSACTION_DATE");
  const iDetail = idx("ORDER_DETAIL");
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur);
    const get = (i: number) => (cols[i] ?? "").replace(/^"|"$/g, "").trim();
    const customerName = get(iName);
    if (!customerName) continue;
    const amount = parseFloat(get(iAmount));
    if (!amount || isNaN(amount)) continue;
    const dateStr = get(iDate).slice(0, 10);
    const date = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
    rows.push({
      customerName,
      phone: get(iPhone).replace(/\s+/g, "") || null,
      city: get(iCity) || null,
      trackingNumber: get(iTracking) || null,
      totalAmount: amount,
      date,
      description: get(iDetail) || "Product",
    });
  }
  return rows;
}

export default function EcomImportModal() {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(parseCSV(ev.target?.result as string));
      setResult(null);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!preview.length) return;
    startTransition(async () => {
      const res = await importEcomOrdersFromCSV(preview);
      setResult(res);
      setPreview([]);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleClose() {
    setOpen(false);
    setPreview([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 border border-gray-200 bg-white text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold">Import Orders (PostEx CSV)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Upload PostEx order history CSV — duplicates are skipped automatically</p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-black text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">CSV File</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800"
                />
              </div>

              {result && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
                  ✓ {result.created} orders imported · {result.skipped} skipped (duplicate or invalid)
                </div>
              )}

              {preview.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                    {preview.length} orders ready to import
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr className="text-xs text-gray-400 uppercase tracking-wide text-left">
                            <th className="py-2 px-3">Customer</th>
                            <th className="py-2 px-3">City</th>
                            <th className="py-2 px-3">Tracking</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {preview.map((r, i) => (
                            <tr key={i}>
                              <td className="py-2 px-3 font-medium">{r.customerName}<br /><span className="text-xs text-gray-400">{r.phone}</span></td>
                              <td className="py-2 px-3 text-gray-500">{r.city ?? "—"}</td>
                              <td className="py-2 px-3 text-gray-500 font-mono text-xs">{r.trackingNumber ?? "—"}</td>
                              <td className="py-2 px-3 text-right tabular-nums font-medium">Rs {r.totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-3 text-gray-400 text-xs">{r.date.toISOString().slice(0, 10)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={pending}
                    className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {pending ? "Importing..." : `Import ${preview.length} Orders`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
