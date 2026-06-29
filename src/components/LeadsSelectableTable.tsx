"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import WhatsAppButton from "@/components/WhatsAppButton";

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
          <span>{selected.size} selected</span>
          <button
            type="button"
            onClick={copySelected}
            className="bg-white text-black text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {copied ? "Copied!" : "Copy Name & Number"}
          </button>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <th className="py-3 px-5 font-medium w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-black"
                />
              </th>
              <th className="py-3 px-5 font-medium">Shop Name</th>
              <th className="py-3 px-5 font-medium">Number</th>
              <th className="py-3 px-5 font-medium">City</th>
              <th className="py-3 px-5"></th>
              <th className="py-3 px-5"></th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-5">
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggleOne(l.id)}
                    className="w-4 h-4 accent-black"
                  />
                </td>
                <td className="py-3 px-5 font-medium">
                  <Link href={`/leads/${l.id}`} className="hover:underline">
                    {l.shopNumber || "-"}
                  </Link>
                </td>
                <td className="py-3 px-5 text-gray-600">{l.phone || "-"}</td>
                <td className="py-3 px-5 text-gray-600">{l.city || "-"}</td>
                <td className="py-3 px-5">
                  <WhatsAppButton phone={l.phone} />
                </td>
                <td className="py-3 px-5 text-right">
                  <form action={contactedAction.bind(null, l.id)}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-gray-500 hover:text-black transition-colors"
                    >
                      Mark Contacted
                    </button>
                  </form>
                </td>
                <td className="py-3 px-5 text-right">
                  <form action={deleteAction.bind(null, l.id)}>
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
