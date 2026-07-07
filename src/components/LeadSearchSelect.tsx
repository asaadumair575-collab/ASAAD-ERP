"use client";

import { useState, useRef, useEffect } from "react";

type Lead = { id: number; shopNumber: string; name: string | null; city: string };

export default function LeadSearchSelect({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? leads.filter((l) => {
        const q = query.toLowerCase();
        return (
          l.shopNumber.toLowerCase().includes(q) ||
          l.name?.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q)
        );
      })
    : leads;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(lead: Lead) {
    setSelected(lead);
    setQuery(lead.shopNumber + (lead.name ? ` — ${lead.name}` : ""));
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="leadId" value={selected?.id ?? ""} />
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search shop name, city…"
          autoComplete="off"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        {selected && (
          <button type="button" onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No results</p>
          ) : (
            filtered.map((l) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={() => pick(l)}
                className="w-full text-left flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <span>
                  <span className="font-medium">{l.shopNumber}</span>
                  {l.name && <span className="text-gray-400 ml-1.5">— {l.name}</span>}
                </span>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{l.city}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
