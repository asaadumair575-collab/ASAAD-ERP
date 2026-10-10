"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo, useDemoReady } from "@/lib/demo/store";
import { Loading } from "./ui";

const NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/demo", label: "Dashboard", icon: <path d="M3 3h6v6H3zM11 3h6v4h-6zM11 9h6v8h-6zM3 11h6v6H3z" /> },
  { href: "/demo/customers", label: "Customers", icon: <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1.5 17a5.5 5.5 0 0 1 11 0M13.5 3.5a3 3 0 0 1 0 5.5M18.5 17a5.5 5.5 0 0 0-3.5-5.1" /> },
  { href: "/demo/invoices", label: "Sales & Invoices", icon: <path d="M5 2h7l4 4v12H5zM12 2v4h4M8 10h5M8 13h5" /> },
  { href: "/demo/payments", label: "Payments", icon: <path d="M2 5h16v10H2zM2 8h16M5 12h3" /> },
  { href: "/demo/finance", label: "Finance", icon: <path d="M10 2v16M14 5.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5S7.8 8 10 8.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" /> },
  { href: "/demo/reports", label: "Reports", icon: <path d="M3 17V9M8 17V4M13 17v-6M18 17V7" /> },
];

export function CompanyLogo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="rounded-xl bg-[#F15A24] text-white font-bold flex items-center justify-center shrink-0 shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      YC
    </span>
  );
}

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const ready = useDemoReady();
  const reset = useDemo((s) => s.reset);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const isActive = (href: string) => (href === "/demo" ? pathname === "/demo" : pathname.startsWith(href));

  const nav = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-2.5 px-5 shrink-0">
        <CompanyLogo />
        <span className="text-[15px] font-bold tracking-tight text-gray-900">Your Company</span>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              isActive(n.href) ? "bg-[#F15A24] text-white font-semibold shadow-sm shadow-orange-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0">
              {n.icon}
            </svg>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            if (confirm("Reset the demo to its original sample data?")) {
              reset();
              router.push("/demo");
            }
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
            <path d="M3 10a7 7 0 1 0 2-4.9M3 3v4h4" />
          </svg>
          Reset demo data
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F7F8FA] text-gray-900">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r border-gray-100 print:hidden">{nav}</aside>
      {open && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col md:hidden transition-transform duration-300 print:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-gray-100 print:hidden">
          <button type="button" onClick={() => setOpen(true)} className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-50" aria-label="Open menu">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <form
            className="flex-1 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/demo/customers?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <div className="relative">
              <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
                <path d="M8.5 15A6.5 6.5 0 1 0 8.5 2a6.5 6.5 0 0 0 0 13ZM18 18l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search customers, invoices…"
                className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-100 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F15A24]/30 focus:bg-white"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-100 rounded-xl px-3 py-2">
              Main Branch
            </span>
            <span className="relative p-2 text-gray-500">
              <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
                <path d="M10 2a6 6 0 0 0-6 6v2.5l-1.5 2.5h15L16 10.5V8a6 6 0 0 0-6-6ZM8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F15A24]" />
            </span>
            <span className="w-9 h-9 rounded-full bg-[#F15A24] text-white text-xs font-semibold flex items-center justify-center">YC</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0">{ready ? children : <Loading />}</div>
        </main>
      </div>
    </div>
  );
}
