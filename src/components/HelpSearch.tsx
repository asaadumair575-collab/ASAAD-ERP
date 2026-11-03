"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function HelpSearch({ items }: { items: { slug: string; title: string; summary: string; category: string }[] }) {
  const [q, setQ] = useState("");
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.length ? items.filter((a) => words.every((w) => `${a.title} ${a.summary} ${a.category}`.toLowerCase().includes(w))) : [];
  return (
    <div className="relative max-w-xl">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search guides — e.g. postex token, csv, webhook, profit"
        className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white text-gray-950 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-white/20"
      />
      {words.length > 0 && (
        <div className="absolute z-10 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 max-h-80 overflow-y-auto">
          {hits.length ? hits.map((a) => (
            <Link key={a.slug} href={`/app/help/${a.slug}`} className="block px-4 py-2.5 hover:bg-gray-50">
              <span className="block text-sm font-medium text-gray-950">{a.title}</span>
              <span className="block text-xs text-gray-500">{a.category} · {a.summary}</span>
            </Link>
          )) : <p className="px-4 py-3 text-sm text-gray-500">No guide matches “{q}”.</p>}
        </div>
      )}
    </div>
  );
}
