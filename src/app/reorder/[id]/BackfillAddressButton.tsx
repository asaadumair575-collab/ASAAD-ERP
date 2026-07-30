"use client";

import { useRef, useState, useTransition } from "react";
import { backfillReorderAddresses } from "@/lib/actions";

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

function extractRows(text: string): { phone: string; address: string; email: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map((h) => h.toUpperCase().trim());
  const phoneIdx   = headers.indexOf("CUSTOMER_PHONE");
  const addressIdx = headers.indexOf("DELIVERY_ADDRESS");
  const emailIdx   = headers.indexOf("CUSTOMER_EMAIL");
  if (phoneIdx < 0 || addressIdx < 0) return [];
  return lines.slice(1).map((line) => {
    const cols = splitLine(line);
    const get = (i: number) => (i >= 0 ? (cols[i] ?? "") : "").trim();
    return {
      phone:   get(phoneIdx).replace(/\s+|\t/g, ""),
      address: get(addressIdx),
      email:   get(emailIdx),
    };
  }).filter((r) => r.phone && r.address);
}

export default function BackfillAddressButton({ campaignId }: { campaignId: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = extractRows(ev.target?.result as string);
      if (rows.length === 0) {
        setResult("File mein CUSTOMER_PHONE ya DELIVERY_ADDRESS column nahi mila");
        return;
      }
      startTransition(async () => {
        const updated = await backfillReorderAddresses(campaignId, rows);
        setResult(`✅ ${updated} leads ka address update ho gaya`);
        if (fileRef.current) fileRef.current.value = "";
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex items-center gap-2">
      <label className={`text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer transition-colors ${pending ? "opacity-50 pointer-events-none" : "hover:bg-gray-50 text-gray-600"}`}>
        {pending ? "Updating..." : "📍 Update Addresses"}
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>
      {result && <span className="text-xs text-gray-500">{result}</span>}
    </div>
  );
}
