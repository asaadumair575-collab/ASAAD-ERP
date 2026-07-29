"use client";

import { useRef, useState } from "react";
import { bulkImportRetailOrders } from "@/lib/actions";

type ParsedRow = {
  customerName: string;
  phone: string;
  city: string;
  notes: string;
  deliveryCharge: number;
  items: { description: string; quantity: number; rate: number }[];
  total: number;
  error?: string;
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  // skip header row
  const dataLines = lines.slice(1);
  const rows: ParsedRow[] = [];

  for (const line of dataLines) {
    // split by comma but respect quoted fields
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    const get = (i: number) => (cols[i] ?? "").replace(/^"|"$/g, "").trim();

    const customerName = get(0);
    const phone = get(1);
    const city = get(2);
    const description = get(3);
    const quantity = parseFloat(get(4)) || 0;
    const rate = parseFloat(get(5)) || 0;
    const deliveryCharge = parseFloat(get(6)) || 0;
    const notes = get(7);

    if (!customerName) continue;

    const error = !description ? "Item description missing" : quantity <= 0 ? "Quantity must be > 0" : rate <= 0 ? "Rate must be > 0" : undefined;

    rows.push({
      customerName,
      phone,
      city,
      notes,
      deliveryCharge,
      items: description ? [{ description, quantity, rate }] : [],
      total: quantity * rate,
      error,
    });
  }

  // Merge rows with same customer name (consecutive) into one order with multiple items
  const merged: ParsedRow[] = [];
  for (const row of rows) {
    const last = merged[merged.length - 1];
    if (last && last.customerName === row.customerName && last.phone === row.phone && !row.error && !last.error) {
      last.items.push(...row.items);
      last.total += row.total;
    } else {
      merged.push({ ...row });
    }
  }
  return merged;
}

export default function RetailImportModal() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    const valid = rows.filter((r) => !r.error && r.items.length > 0);
    if (!valid.length) return;
    setImporting(true);
    try {
      const created = await bulkImportRetailOrders(valid);
      setResult(`✓ ${created} orders imported successfully!`);
      setRows([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Import failed"}`);
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = `Customer Name,Phone,City,Item Description,Quantity,Rate,Delivery Charge,Notes
Ali Hassan,03001234567,Lahore,Product A,2,500,200,Handle with care
Ali Hassan,03001234567,Lahore,Product B,1,300,200,
Sara Ahmed,03111234567,Karachi,Product C,3,150,0,
`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "retail-orders-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const validCount = rows.filter((r) => !r.error && r.items.length > 0).length;
  const errorCount = rows.filter((r) => !!r.error).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Bulk Import Retail Orders</h2>
                <p className="text-xs text-gray-400 mt-0.5">Upload a CSV to add multiple orders at once</p>
              </div>
              <button onClick={() => { setOpen(false); setRows([]); setResult(null); }} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Upload area */}
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center gap-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-gray-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-500">Choose CSV file...</span>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                </label>
                <button onClick={downloadTemplate} className="shrink-0 text-xs text-blue-600 hover:underline font-medium">
                  Download Template
                </button>
              </div>

              {/* Column guide */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">CSV Columns (in order):</p>
                <p className="text-xs text-blue-600 font-mono">Customer Name, Phone, City, Item Description, Quantity, Rate, Delivery Charge, Notes</p>
                <p className="text-xs text-blue-500 mt-1">• Same customer name + phone = multiple items in one order</p>
              </div>

              {/* Result message */}
              {result && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${result.startsWith("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                  {result}
                </div>
              )}

              {/* Preview table */}
              {rows.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs font-medium text-gray-600">{rows.length} orders parsed</p>
                    {validCount > 0 && <span className="text-xs text-green-600 font-medium">✓ {validCount} valid</span>}
                    {errorCount > 0 && <span className="text-xs text-red-500 font-medium">✗ {errorCount} errors</span>}
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                          <th className="py-2 px-3 text-left">Customer</th>
                          <th className="py-2 px-3 text-left">City</th>
                          <th className="py-2 px-3 text-left">Items</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-right">Advance</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map((r, i) => (
                          <tr key={i} className={r.error ? "bg-red-50" : ""}>
                            <td className="py-2 px-3 font-medium">
                              {r.customerName}
                              {r.phone && <span className="text-gray-400 ml-1">{r.phone}</span>}
                            </td>
                            <td className="py-2 px-3 text-gray-500">{r.city || "—"}</td>
                            <td className="py-2 px-3 text-gray-500">{r.items.map((it) => `${it.description} ×${it.quantity}`).join(", ")}</td>
                            <td className="py-2 px-3 text-right font-semibold">Rs {r.total.toLocaleString("en-PK", { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-3 text-right text-blue-600">{r.deliveryCharge > 0 ? `Rs ${r.deliveryCharge}` : "—"}</td>
                            <td className="py-2 px-3">
                              {r.error
                                ? <span className="text-red-500 font-medium">{r.error}</span>
                                : <span className="text-green-500">✓</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">Error rows will be skipped during import</p>
              <div className="flex gap-2">
                <button onClick={() => { setOpen(false); setRows([]); setResult(null); }}
                  className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={doImport}
                  disabled={importing || validCount === 0}
                  className="bg-black text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  {importing ? "Importing..." : `Import ${validCount} Orders`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
