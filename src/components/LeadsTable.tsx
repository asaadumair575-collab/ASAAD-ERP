"use client";

import { useMemo, useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { bulkUpdateLeadStatus } from "@/lib/actions";

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

const CONTACT_REASONS = [
  "Interested",
  "Not Interested",
  "Not Working in Balls",
  "Will Contact Later",
  "Wrong Number",
  "No Response",
  "Others",
];

// Directly visible on the row for NEW leads — no burying it in a menu.
// Clicking it immediately asks what happened on the call before saving.
function ContactButton({ lead, contactAction }: {
  lead: Lead;
  contactAction: (id: number, reason?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeAll();
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function closeAll() {
    setOpen(false);
    setSelectedReason("");
    setCustomReason("");
  }

  function confirmContact() {
    const reason = selectedReason === "Others" ? customReason.trim() : selectedReason;
    startTransition(async () => {
      await contactAction(lead.id, reason || undefined);
      closeAll();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors whitespace-nowrap"
      >
        Mark Contacted
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 px-2 text-sm space-y-1">
          <p className="text-xs font-medium text-gray-500 px-1 pb-1 border-b border-gray-100">Baat kya hui? Call result select karein:</p>
          {CONTACT_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => { setSelectedReason(r); if (r !== "Others") setCustomReason(""); }}
              className={`w-full text-left text-xs px-2.5 py-2 rounded-lg transition-colors ${selectedReason === r ? "bg-black text-white" : "hover:bg-gray-50 text-gray-700"}`}
            >
              {r}
            </button>
          ))}
          {selectedReason === "Others" && (
            <input autoFocus type="text" value={customReason} onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Reason likhein..." className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-black mt-1" />
          )}
          <button type="button" onClick={confirmContact}
            disabled={isPending || !selectedReason || (selectedReason === "Others" && !customReason.trim())}
            className="w-full mt-1 bg-black text-white text-xs font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Confirm"}
          </button>
        </div>
      )}
    </div>
  );
}

function RowMenu({ lead, deleteAction }: {
  lead: Lead;
  deleteAction: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "delete">("menu");
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeAll();
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function closeAll() {
    setOpen(false);
    setMode("menu");
  }

  function confirmDelete() {
    startTransition(async () => {
      await deleteAction(lead.id);
      closeAll();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setMode("menu"); }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
          {mode === "menu" && (
            <>
              <Link href={`/leads/${lead.id}`} onClick={closeAll} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors">
                View Details
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button type="button" onClick={() => setMode("delete")} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 transition-colors">
                Delete
              </button>
            </>
          )}

          {mode === "delete" && (
            <div className="px-2 py-2 space-y-2">
              <p className="text-xs text-gray-500 px-1">Delete this lead?</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setMode("menu")} className="flex-1 text-xs border border-gray-200 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={confirmDelete} disabled={isPending}
                  className="flex-1 text-xs bg-red-600 text-white py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {isPending ? "…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrintModal({
  leads,
  onClose,
}: {
  leads: Lead[];
  onClose: () => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set(leads.map((l) => l.id)));

  function toggleOne(id: number) {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function doPrint() {
    const toPrint = leads.filter((l) => checked.has(l.id));
    const rows = toPrint.map((l, i) =>
      `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:500">${l.shopNumber || l.name || "-"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${l.city || "-"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${l.phone || "-"}</td>
      </tr>`
    ).join("");
    const html = `<!doctype html><html><head><title>Leads List</title>
      <style>body{font-family:sans-serif;font-size:13px;margin:20px}table{border-collapse:collapse;width:100%}th{background:#f5f5f5;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em}@media print{button{display:none}}</style>
      </head><body>
      <h2 style="font-size:16px;font-weight:600;margin-bottom:16px">Leads List (${toPrint.length})</h2>
      <table><thead><tr><th>#</th><th>Shop</th><th>City</th><th>Phone</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print()<\/script></body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  const allChecked = checked.size === leads.length;
  const noneChecked = checked.size === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold">Print List — {leads.length} selected</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>
        <div className="px-5 py-2 border-b border-gray-50 flex items-center gap-2 text-xs text-gray-500">
          <button type="button" onClick={() => setChecked(new Set(leads.map(l => l.id)))} className={`px-2.5 py-1 rounded-lg transition-colors ${allChecked ? "bg-black text-white" : "hover:bg-gray-100"}`}>All</button>
          <button type="button" onClick={() => setChecked(new Set())} className={`px-2.5 py-1 rounded-lg transition-colors ${noneChecked ? "bg-black text-white" : "hover:bg-gray-100"}`}>None</button>
          <span className="ml-auto">{checked.size} of {leads.length} included</span>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {leads.map((l) => (
            <label key={l.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={checked.has(l.id)}
                onChange={() => toggleOne(l.id)}
                className="w-4 h-4 accent-black rounded shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{l.shopNumber || l.name || "-"}</p>
                <p className="text-xs text-gray-400">{l.city || ""}{l.city && l.phone ? " · " : ""}{l.phone || ""}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={doPrint} disabled={noneChecked} className="text-sm px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-40">
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsTable({
  leads,
  contactAction,
  deleteAction,
}: {
  leads: Lead[];
  contactAction: (id: number, reason?: string) => Promise<void>;
  deleteAction: (id: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isPending, startTransition] = useTransition();
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setShowStatusMenu(false);
    }
    if (showStatusMenu) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showStatusMenu]);

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

  function applyBulkStatus(status: string) {
    setShowStatusMenu(false);
    startTransition(async () => {
      await bulkUpdateLeadStatus(Array.from(selected), status);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {showPrint && (
        <PrintModal leads={selectedLeads} onClose={() => setShowPrint(false)} />
      )}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-black text-white rounded-xl px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setShowStatusMenu((v) => !v)}
                disabled={isPending}
                className="bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white/25 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isPending ? "Updating…" : "Change Status"}
                <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3"><path d="M6 8L1 3h10z"/></svg>
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 bottom-full mb-1 z-50 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
                  {Object.entries(statusConfig).map(([value, cfg]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => applyBulkStatus(value)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPrint(true)}
              className="bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white/25 transition-colors"
            >
              Print
            </button>
            <button
              type="button"
              onClick={copySelected}
              className="bg-white text-black text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy Name & Number"}
            </button>
          </div>
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
                    {l.status === "NEW" && <ContactButton lead={l} contactAction={contactAction} />}
                    <RowMenu lead={l} deleteAction={deleteAction} />
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
