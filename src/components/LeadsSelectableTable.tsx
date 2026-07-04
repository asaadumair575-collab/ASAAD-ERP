"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import WhatsAppButton from "@/components/WhatsAppButton";
import DeleteButton from "@/components/DeleteButton";

type Lead = {
  id: number;
  shopNumber: string | null;
  phone: string | null;
  city: string | null;
};

export default function LeadsSelectableTable({
  leads,
  contactedAction,
  deleteAction,
}: {
  leads: Lead[];
  contactedAction: (id: number) => Promise<void>;
  deleteAction: (id: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedLeads = useMemo(
    () => leads.filter((l) => selected.has(l.id)),
    [leads, selected]
  );

  async function copyNumber(id: number, phone: string | null) {
    if (!phone) return;
    await navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function copySelected() {
    const text = selectedLeads
      .map((l) => `${l.shopNumber || "-"} - ${l.phone || "-"}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-black text-white rounded-xl px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <button
            type="button"
            onClick={copySelected}
            className="bg-white text-black text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {copied ? "✓ Copied!" : "Copy Name & Number"}
          </button>
        </div>
      )}

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
              <th className="py-3 px-5 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-black" />
              </th>
              <th className="py-3 px-5">Shop Name</th>
              <th className="py-3 px-5">Number</th>
              <th className="py-3 px-5">City</th>
              <th className="py-3 px-5"></th>
              <th className="py-3 px-5"></th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="py-3 px-5">
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleOne(l.id)} className="w-4 h-4 accent-black" />
                </td>
                <td className="py-3 px-5 font-medium">
                  <Link href={`/leads/${l.id}`} className="hover:underline">{l.shopNumber || "-"}</Link>
                </td>
                <td className="py-3 px-5 text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span>{l.phone || "-"}</span>
                    {l.phone && (
                      <button
                        type="button"
                        onClick={() => copyNumber(l.id, l.phone)}
                        title="Copy number"
                        className="text-gray-300 hover:text-black transition-colors"
                      >
                        {copiedId === l.id ? (
                          <span className="text-xs text-green-600">✓</span>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
                            <rect x="7" y="7" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M4 13V5.5A1.5 1.5 0 0 1 5.5 4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </td>
                <td className="py-3 px-5 text-gray-500">{l.city || "-"}</td>
                <td className="py-3 px-5"><WhatsAppButton phone={l.phone} /></td>
                <td className="py-3 px-5 text-right">
                  <form action={contactedAction.bind(null, l.id)}>
                    <button type="submit" className="text-xs font-medium text-gray-500 hover:text-black transition-colors">
                      Mark Contacted
                    </button>
                  </form>
                </td>
                <td className="py-3 px-5 text-right">
                  <DeleteButton action={deleteAction.bind(null, l.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
