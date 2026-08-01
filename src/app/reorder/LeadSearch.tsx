"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { searchReorderLeads } from "@/lib/actions";

type Result = {
  id: number;
  customerName: string;
  phone: string;
  city: string | null;
  status: string;
  campaign: { id: number; name: string };
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:        { label: "Pending",        color: "bg-gray-100 text-gray-500" },
  NO_ANSWER:      { label: "No Answer",      color: "bg-yellow-100 text-yellow-700" },
  NOT_INTERESTED: { label: "Not Interested", color: "bg-red-100 text-red-600" },
  ORDER_PLACED:   { label: "Interested",     color: "bg-violet-100 text-violet-700" },
  ORDER_RECEIVED: { label: "Order Received", color: "bg-green-100 text-green-700" },
};

export default function LeadSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function search() {
    if (!q.trim()) return;
    startTransition(async () => {
      const data = await searchReorderLeads(q.trim());
      setResults(data);
      setSearched(true);
    });
  }

  function close() {
    setOpen(false);
    setQ("");
    setResults([]);
    setSearched(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors flex items-center gap-1.5"
      >
        🔍 Search Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40" onClick={close}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>

            {/* Search input */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-100">
              <input
                type="text"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Name ya phone number likhein..."
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={search}
                disabled={pending || !q.trim()}
                className="bg-black text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {pending ? "..." : "Search"}
              </button>
              <button onClick={close} className="text-gray-300 hover:text-gray-500 text-lg leading-none px-1">✕</button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {!searched ? (
                <p className="text-xs text-gray-400 text-center py-8">Name ya phone likh ke search karein</p>
              ) : results.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Koi customer nahi mila</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {results.map((r) => {
                    const st = STATUS_LABELS[r.status] ?? STATUS_LABELS.PENDING;
                    return (
                      <Link
                        key={r.id}
                        href={`/reorder/${r.campaign.id}?q=${encodeURIComponent(r.phone)}`}
                        onClick={close}
                        className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{r.customerName}</p>
                          <p className="text-xs text-gray-400 font-mono">{r.phone}</p>
                          {r.city && <p className="text-xs text-gray-300">{r.city}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">📁 {r.campaign.name}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>
                          {st.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
