"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";

type Lead = {
  id: number;
  shopNumber: string | null;
  name: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  createdAt: Date;
};

const statusConfig: Record<string, { label: string; dot: string; pill: string }> = {
  NEW: {
    label: "Not Contacted",
    dot: "bg-gray-400",
    pill: "bg-gray-100 text-gray-600 border border-gray-200",
  },
  CONTACTED: {
    label: "Contacted",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  SAMPLE_SENT: {
    label: "Sample Sent",
    dot: "bg-purple-500",
    pill: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  CANCELLED: {
    label: "Cancelled",
    dot: "bg-red-400",
    pill: "bg-red-50 text-red-700 border border-red-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    dot: "bg-green-500",
    pill: "bg-green-50 text-green-700 border border-green-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, dot: "bg-gray-400", pill: "bg-gray-100 text-gray-600 border border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path d="M3.5 4.5A1 1 0 0 1 4.5 3.5h2.25a1 1 0 0 1 .95.684l.688 2.063a1 1 0 0 1-.23 1.023L7.0 8.383a9.5 9.5 0 0 0 4.617 4.617l1.113-1.163a1 1 0 0 1 1.023-.23l2.063.688a1 1 0 0 1 .684.95V15.5a1 1 0 0 1-1 1H15C8.649 16.5 3.5 11.351 3.5 5v-.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path d="M10 2.5a7.5 7.5 0 0 1 6.5 11.25L17.5 17.5l-3.75-1a7.5 7.5 0 1 1-3.75-14Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 8.5c.5 1 1.5 2.5 4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <circle cx="10" cy="4" r="1.5"/>
      <circle cx="10" cy="10" r="1.5"/>
      <circle cx="10" cy="16" r="1.5"/>
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 shrink-0">
      <path d="M10 2a5 5 0 0 1 5 5c0 4-5 11-5 11S5 11 5 7a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="10" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function RowMenu({ lead, contactAction, deleteAction }: {
  lead: Lead;
  contactAction: (id: number) => Promise<void>;
  deleteAction: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
          <Link
            href={`/leads/${lead.id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            View Details
          </Link>
          {lead.status === "NEW" && (
            <form action={contactAction.bind(null, lead.id)}>
              <button type="submit" className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors">
                Mark Contacted
              </button>
            </form>
          )}
          <div className="border-t border-gray-100 my-1" />
          <form action={deleteAction.bind(null, lead.id)}>
            <button type="submit" className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 transition-colors">
              Delete
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function LeadsTable({
  leads,
  contactAction,
  deleteAction,
}: {
  leads: Lead[];
  contactAction: (id: number) => Promise<void>;
  deleteAction: (id: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedLeads = useMemo(() => leads.filter((l) => selected.has(l.id)), [leads, selected]);

  async function copySelected() {
    const text = selectedLeads.map((l) => `${l.shopNumber || "-"} - ${l.phone || "-"}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsApp(phone: string | null) {
    if (!phone) return;
    const digits = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${digits}`, "_blank");
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
              <th className="py-3 px-4 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-black rounded" />
              </th>
              <th className="py-3 px-4">Shop</th>
              <th className="py-3 px-4">City</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map((l) => (
              <tr key={l.id} className={`hover:bg-gray-50/70 transition-colors ${selected.has(l.id) ? "bg-blue-50/30" : ""}`}>
                <td className="py-3 px-4">
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleOne(l.id)} className="w-4 h-4 accent-black rounded" />
                </td>
                <td className="py-3 px-4">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline text-gray-900">
                    {l.shopNumber || l.name || "-"}
                  </Link>
                  {l.phone && (
                    <p className="text-xs text-gray-400 mt-0.5">{l.phone}</p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1 text-gray-500">
                    <LocationIcon />
                    {l.city || "-"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={l.status} />
                </td>
                <td className="py-3 px-4 text-gray-500 tabular-nums">
                  {l.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => openWhatsApp(l.phone)}
                      title="Call / WhatsApp"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <PhoneIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => openWhatsApp(l.phone)}
                      title="WhatsApp"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <WhatsAppIcon />
                    </button>
                    <RowMenu lead={l} contactAction={contactAction} deleteAction={deleteAction} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
