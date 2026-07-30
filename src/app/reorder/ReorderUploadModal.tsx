"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createReorderCampaign } from "@/lib/actions";

type Lead = { customerName: string; phone: string; city: string; prevItem: string };

function splitLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols.map((c) => c.replace(/^"|"$/g, "").trim());
}

// Clean up courier customer names that repeat themselves: "Ali Khan Ali Khan" → "Ali Khan"
function cleanName(raw: string): string {
  const s = raw.trim();
  const half = Math.floor(s.length / 2);
  if (s.length > 4 && s.length % 2 === 0) {
    const a = s.slice(0, half);
    const b = s.slice(half).trim();
    if (a.trim().toLowerCase() === b.toLowerCase()) return a.trim();
  }
  // Try space-split dedup: "Ali Khan Abc Ali Khan Abc" → split words, find repeated prefix
  const words = s.split(/\s+/);
  for (let len = 1; len <= Math.floor(words.length / 2); len++) {
    const prefix = words.slice(0, len).join(" ").toLowerCase();
    const rest = words.slice(len, len * 2).join(" ").toLowerCase();
    if (prefix === rest) return words.slice(0, len).join(" ");
  }
  return s;
}

// Clean up item description from courier format: "[ 1 x Cancon Pro 72 - Pack 6 -  ]" → "Cancon Pro 72 - Pack 6"
function cleanItem(raw: string): string {
  // Extract from "[ N x Product Name -  ]" pattern
  const match = raw.match(/\[\s*\d+\s*x\s*(.+?)\s*-\s*\]/);
  if (match) return match[1].trim();
  // Multiple items: combine them
  const allMatches = [...raw.matchAll(/\[\s*(\d+)\s*x\s*(.+?)\s*-\s*\]/g)];
  if (allMatches.length > 1) {
    return allMatches.map((m) => `${m[2].trim()} ×${m[1]}`).join(", ");
  }
  return raw.replace(/^\[|\]$/g, "").trim() || raw.trim();
}

function parseCSV(text: string): Lead[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitLine(lines[0]).map((h) => h.toUpperCase());

  // Detect courier format by checking for known courier column names
  const isCourierFormat =
    headers.includes("CUSTOMER_NAME") ||
    headers.includes("CUSTOMER_PHONE") ||
    headers.includes("TRACKING_NUMBER");

  const seen = new Map<string, Lead>();

  if (isCourierFormat) {
    // Courier CSV format (PostEx / TCS etc.)
    const nameIdx   = headers.indexOf("CUSTOMER_NAME");
    const phoneIdx  = headers.indexOf("CUSTOMER_PHONE");
    const cityIdx   = headers.indexOf("CITY_NAME");
    const itemIdx   = headers.indexOf("ORDER_DETAIL");
    const statusIdx = headers.indexOf("MERCHANT_TRANSACTION_STATUS");

    for (const line of lines.slice(1)) {
      const cols = splitLine(line);
      const get = (i: number) => (i >= 0 ? (cols[i] ?? "") : "").trim();

      // Only include delivered orders
      if (statusIdx >= 0 && get(statusIdx).toLowerCase() !== "delivered") continue;

      const customerName = cleanName(get(nameIdx));
      const phone = get(phoneIdx).replace(/\s+/g, "").replace(/\t/g, "");
      const city = get(cityIdx);
      const prevItem = cleanItem(get(itemIdx));

      if (!customerName || !phone) continue;

      const key = `${phone}`;
      if (!seen.has(key)) {
        seen.set(key, { customerName, phone, city, prevItem });
      } else {
        const existing = seen.get(key)!;
        if (prevItem && !existing.prevItem.includes(prevItem)) {
          existing.prevItem = existing.prevItem ? `${existing.prevItem}, ${prevItem}` : prevItem;
        }
      }
    }
  } else {
    // Retail orders CSV format: Customer Name, Phone, City, Item Description, ...
    for (const line of lines.slice(1)) {
      const cols = splitLine(line);
      const get = (i: number) => (cols[i] ?? "").trim();

      const customerName = get(0);
      const phone = get(1);
      const city = get(2);
      const prevItem = get(3);

      if (!customerName || !phone) continue;

      const key = `${customerName}||${phone}`;
      if (!seen.has(key)) {
        seen.set(key, { customerName, phone, city, prevItem });
      } else {
        const existing = seen.get(key)!;
        if (prevItem && !existing.prevItem.includes(prevItem)) {
          existing.prevItem = existing.prevItem ? `${existing.prevItem}, ${prevItem}` : prevItem;
        }
      }
    }
  }

  return Array.from(seen.values());
}

export default function ReorderUploadModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!name) setName(file.name.replace(/\.csv$/i, ""));
    const reader = new FileReader();
    reader.onload = (ev) => setLeads(parseCSV(ev.target?.result as string));
    reader.readAsText(file);
  }

  function close() {
    setOpen(false);
    setLeads([]);
    setName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!name.trim() || leads.length === 0) return;
    setSaving(true);
    try {
      const id = await createReorderCampaign(name.trim(), leads);
      close();
      router.push(`/reorder/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shrink-0"
      >
        + Upload CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-800">New Reorder Campaign</h2>
                <p className="text-xs text-gray-400 mt-0.5">Upload a delivered-parcels CSV to create a call list</p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Campaign Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. July Delivered Batch"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">CSV File (same format as retail orders)</label>
                <label className="flex items-center gap-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-gray-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-500">Choose CSV file...</span>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                </label>
                <p className="text-xs text-gray-400 mt-1">Automatically detects courier CSV (PostEx/TCS) or retail orders format</p>
              </div>

              {leads.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">{leads.length} customers found</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                          <th className="py-2 px-3 text-left">#</th>
                          <th className="py-2 px-3 text-left">Customer</th>
                          <th className="py-2 px-3 text-left">Phone</th>
                          <th className="py-2 px-3 text-left">City</th>
                          <th className="py-2 px-3 text-left">Last Item</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leads.map((l, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                            <td className="py-2 px-3 font-medium">{l.customerName}</td>
                            <td className="py-2 px-3 text-gray-500 font-mono">{l.phone}</td>
                            <td className="py-2 px-3 text-gray-500">{l.city || "—"}</td>
                            <td className="py-2 px-3 text-gray-500 truncate max-w-[160px]">{l.prevItem || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button onClick={close} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving || !name.trim() || leads.length === 0}
                className="bg-black text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {saving ? "Creating..." : `Create Campaign (${leads.length} leads)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
