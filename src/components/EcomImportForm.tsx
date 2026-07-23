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

  // parse header
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

    // simple CSV split — handle quoted fields
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

export default function EcomImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPreview(parseCSV(text));
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

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <label className="text-sm font-medium text-gray-700 mb-2 block">CSV File (PostEx Order History)</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800"
        />
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700 font-medium">
          ✓ {result.created} orders import hue · {result.skipped} skip hue (duplicate ya invalid)
        </div>
      )}

      {preview.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
            {preview.length} orders ready to import
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                  <th className="py-2 px-4">Customer</th>
                  <th className="py-2 px-4">City</th>
                  <th className="py-2 px-4">Tracking</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                  <th className="py-2 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 px-4 font-medium">{r.customerName}<br /><span className="text-xs text-gray-400">{r.phone}</span></td>
                    <td className="py-2 px-4 text-gray-500">{r.city ?? "—"}</td>
                    <td className="py-2 px-4 text-gray-500 font-mono text-xs">{r.trackingNumber ?? "—"}</td>
                    <td className="py-2 px-4 text-right tabular-nums font-medium">Rs {r.totalAmount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                    <td className="py-2 px-4 text-gray-400 text-xs">{r.date.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  );
}
