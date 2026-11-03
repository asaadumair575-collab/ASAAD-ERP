"use client";

import {
  BarChart3, Bell, Boxes, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Menu, Plug, Receipt, Search, Settings,
  ShoppingCart, Truck, Users, Wallet, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  {
    group: "Operations",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/orders", label: "Orders", icon: ShoppingCart },
      { href: "/app/shipments", label: "Shipments", icon: Truck },
      { href: "/app/cod", label: "COD & Profit", icon: Wallet },
    ],
  },
  {
    group: "Store",
    items: [
      { href: "/app/inventory", label: "Inventory", icon: Boxes },
      { href: "/app/customers", label: "Customers", icon: Users },
      { href: "/app/expenses", label: "Expenses", icon: Receipt },
      { href: "/app/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    group: "Setup",
    items: [
      { href: "/app/integrations", label: "Integrations", icon: Plug },
      { href: "/app/settings", label: "Settings", icon: Settings },
      { href: "/app/help", label: "Help & Guides", icon: CircleHelp },
    ],
  },
];

export type ShellInfo = {
  appName: string;
  storeName: string;
  userName: string;
  role: string;
  newOrders: number;
  shopify: string | null; // "synced 4 min ago" / null when not connected
  plan: { label: string; note: string; warn: boolean };
};

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export default function AppShell({ info, logout, children }: { info: ShellInfo; logout: () => Promise<void>; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const active = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-2.5 px-5 shrink-0">
        <span className="w-8 h-8 rounded-lg bg-white text-gray-950 text-xs font-bold flex items-center justify-center">{initials(info.appName)}</span>
        <span className="text-[15px] font-semibold tracking-tight text-white truncate">{info.appName}</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-500">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active(href) ? "bg-white text-gray-950 font-semibold" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  {href === "/app/orders" && info.newOrders > 0 && (
                    <span className={`text-[11px] font-semibold rounded-full px-1.5 ${active(href) ? "bg-gray-950 text-white" : "bg-white/10 text-white"}`}>{info.newOrders}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-2xl bg-white/5 border border-white/10 p-4">
        <p className={`text-xs font-semibold ${info.plan.warn ? "text-amber-400" : "text-white"}`}>{info.plan.label}</p>
        <p className="text-xs text-gray-400 mt-1">{info.plan.note}</p>
        <Link href="/app/help" onClick={() => setOpen(false)} className="inline-block mt-2 text-xs font-semibold text-white/80 hover:text-white">Setup guides →</Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-gray-950 no-print">{sidebar}</aside>
      {open && <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 transition-transform duration-200 no-print ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <button type="button" onClick={() => setOpen(false)} className="absolute top-5 right-4 text-gray-400" aria-label="Close menu"><X className="w-5 h-5" /></button>
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-gray-200/70 no-print">
          <button type="button" onClick={() => setOpen(true)} className="md:hidden p-2 -ml-1 rounded-xl text-gray-600 hover:bg-gray-50" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <form
            className="flex-1 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/app/orders?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search orders, phone, tracking…"
                className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-100 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950/10 focus:bg-white"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link href="/app/integrations" className="hidden lg:inline-flex items-center gap-2 text-xs text-gray-600 border border-gray-200/70 rounded-xl px-3 py-2 hover:bg-gray-50">
              <span className={`w-2 h-2 rounded-full ${info.shopify ? "bg-emerald-500" : "bg-gray-300"}`} />
              {info.shopify ? `Shopify · ${info.shopify}` : "Shopify not connected"}
            </Link>
            <Link href="/app/orders?status=NEW" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-50" aria-label="New orders">
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {info.newOrders > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-gray-950 text-white text-[10px] font-bold flex items-center justify-center">
                  {info.newOrders > 99 ? "99+" : info.newOrders}
                </span>
              )}
            </Link>
            <Link href="/app/help" className="hidden sm:block p-2 rounded-xl text-gray-500 hover:bg-gray-50" aria-label="Help">
              <CircleHelp className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl hover:bg-gray-50 pl-1 pr-2 py-1">
                <span className="w-9 h-9 rounded-full bg-gray-950 text-white text-xs font-semibold flex items-center justify-center">{initials(info.storeName)}</span>
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-sm font-semibold text-gray-950 max-w-36 truncate">{info.storeName}</span>
                  <span className="block text-xs text-gray-400">{info.userName} · {info.role}</span>
                </span>
                <ChevronDown className="hidden sm:block w-4 h-4 text-gray-400" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-white border border-gray-200/70 rounded-xl shadow-lg py-1">
                    <Link href="/app/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Settings className="w-4 h-4" />Settings</Link>
                    <Link href="/app/help" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><CircleHelp className="w-4 h-4" />Help & Guides</Link>
                    <form action={logout}>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600"><LogOut className="w-4 h-4" />Sign out</button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
