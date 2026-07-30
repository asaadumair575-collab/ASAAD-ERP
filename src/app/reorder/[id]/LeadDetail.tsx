"use client";
import { useState } from "react";

type Lead = {
  customerName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  prevItem?: string | null;
};

export default function LeadDetail({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-gray-800 hover:underline underline-offset-2 text-left leading-tight"
      >
        {lead.customerName}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-gray-900">{lead.customerName}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-2 text-sm">
              <Row icon="📞" label="Phone" value={lead.phone} mono />
              {lead.email    && <Row icon="✉️"  label="Email"   value={lead.email} />}
              {lead.city     && <Row icon="📍" label="City"    value={lead.city} />}
              {lead.address  && <Row icon="🏠" label="Address" value={lead.address} />}
              {lead.prevItem && <Row icon="📦" label="Last Order" value={lead.prevItem} />}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-full border border-gray-200 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 mt-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-gray-700 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
