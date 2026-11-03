"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo, useDemoReady } from "@/lib/demo/store";
import { Loading, isoDaysAgo, timeAgo } from "./ui";

const NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/demo", label: "Dashboard", icon: <path d="M3 3h6v6H3zM11 3h6v4h-6zM11 9h6v8h-6zM3 11h6v6H3z" /> },
  { href: "/demo/orders", label: "Orders", icon: <path d="M3 4h2l1.6 8.2a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L17.5 7H6M9 17h.01M15 17h.01" /> },
  { href: "/demo/shipments", label: "Shipments", icon: <path d="M1 5h11v9H1zM12 8h4l3 3v3h-7M5 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" /> },
  { href: "/demo/customers", label: "Customers", icon: <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1.5 17a5.5 5.5 0 0 1 11 0M13.5 3.5a3 3 0 0 1 0 5.5M18.5 17a5.5 5.5 0 0 0-3.5-5.1" /> },
  { href: "/demo/products", label: "Products", icon: <path d="M10 2 3 5.5v9L10 18l7-3.5v-9L10 2zM3 5.5 10 9l7-3.5M10 9v9" /> },
  { href: "/demo/finance", label: "Finance", icon: <path d="M10 2v16M14 5.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5S7.8 8 10 8.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" /> },
  { href: "/demo/integrations", label: "Integrations", icon: <path d="M7 3v4M13 3v4M5 7h10v3a5 5 0 0 1-10 0V7zM10 15v3" /> },
  { href: "/demo/billing", label: "Subscription", icon: <path d="M2 5h16v10H2zM2 8h16M5 12h3" /> },
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

// How often a "new Shopify order" arrives while the demo is open, so a
// prospect sees orders flowing in.
const LIVE_ORDER_MS = 40_000;

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const ready = useDemoReady();
  const loggedIn = useDemo((s) => s.loggedIn);
  const isLogin = pathname === "/demo/login";

  useEffect(() => {
    if (ready && !loggedIn && !isLogin) router.replace("/demo/login");
    if (ready && loggedIn && isLogin) router.replace("/demo");
  }, [ready, loggedIn, isLogin, router]);

  if (!ready) return <div className="min-h-dvh bg-[#F7F8FA]"><Loading /></div>;
  if (isLogin) return <>{children}</>;
  if (!loggedIn) return <div className="min-h-dvh bg-[#F7F8FA]"><Loading /></div>;
  return <AppFrame>{children}</AppFrame>;
}

function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const unread = useDemo((s) => s.unread);
  const newOrders = useDemo((s) => s.orders.filter((o) => o.status === "New").length);
  const shopify = useDemo((s) => s.integrations.shopify);
  const syncShopify = useDemo((s) => s.syncShopify);
  const toast = useDemo((s) => s.toast);
  const toasts = useDemo((s) => s.toasts);
  const dismissToast = useDemo((s) => s.dismissToast);
  const logout = useDemo((s) => s.logout);
  const reset = useDemo((s) => s.reset);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [, setTick] = useState(0);

  // Live feed: a new Shopify order now and then, with a toast.
  useEffect(() => {
    const t = setInterval(() => {
      const n = syncShopify(1);
      if (n) {
        const last = useDemo.getState().orders.at(-1);
        if (last) toast(`New order ${last.number} received from Shopify`);
      }
      setTick((x) => x + 1);
    }, LIVE_ORDER_MS);
    return () => clearInterval(t);
  }, [syncShopify, toast]);

  const isActive = (href: string) => (href === "/demo" ? pathname === "/demo" : pathname.startsWith(href));

  const nav = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-2.5 px-5 shrink-0">
        <CompanyLogo />
        <span className="text-[15px] font-bold tracking-tight text-gray-900">Your Company</span>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
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
            <span className="flex-1">{n.label}</span>
            {n.href === "/demo/orders" && newOrders > 0 && (
              <span className={`text-[11px] font-semibold px-1.5 rounded-full ${isActive(n.href) ? "bg-white/25 text-white" : "bg-[#FFF1EA] text-[#D9480F]"}`}>{newOrders}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="m-3 rounded-2xl bg-[#FFF1EA] p-4">
        <p className="text-xs font-semibold text-[#D9480F]">Growth Plan · Active</p>
        <p className="text-xs text-gray-600 mt-1">Renews on {new Date(isoDaysAgo(-18)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
        <Link href="/demo/billing" onClick={() => setOpen(false)} className="inline-block mt-2 text-xs font-semibold text-[#F15A24] hover:text-[#D9480F]">Manage plan →</Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F7F8FA] text-gray-900">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r border-gray-100 print:hidden">{nav}</aside>
      {open && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col md:hidden transition-transform duration-300 print:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {nav}
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-gray-100 print:hidden">
          <button type="button" onClick={() => setOpen(true)} className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-50" aria-label="Open menu">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <form
            className="flex-1 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/demo/orders?q=${encodeURIComponent(q.trim())}`);
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
                placeholder="Search orders, customers, tracking…"
                className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-100 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F15A24]/30 focus:bg-white"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/demo/integrations" className="hidden lg:inline-flex items-center gap-2 text-xs text-gray-600 border border-gray-100 rounded-xl px-3 py-2 hover:bg-gray-50">
              <span className={`w-2 h-2 rounded-full ${shopify.connected ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
              {shopify.connected ? `Shopify synced ${timeAgo(shopify.lastSync)}` : "Shopify disconnected"}
            </Link>
            <Link href="/demo/orders?status=New" className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-50" aria-label="New orders">
              <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
                <path d="M10 2a6 6 0 0 0-6 6v2.5l-1.5 2.5h15L16 10.5V8a6 6 0 0 0-6-6ZM8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#F15A24] text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>
              )}
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl hover:bg-gray-50 pl-1 pr-2 py-1">
                <span className="w-9 h-9 rounded-full bg-[#F15A24] text-white text-xs font-semibold flex items-center justify-center">YS</span>
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-sm font-semibold text-gray-900">Your Store</span>
                  <span className="block text-xs text-gray-400">Owner</span>
                </span>
              </button>
              {menu && (
                <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1" onMouseLeave={() => setMenu(false)}>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      if (confirm("Reset the demo to its original sample data?")) {
                        reset();
                        router.push("/demo");
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Reset demo data
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      router.replace("/demo/login");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0">{children}</div>
        </main>
      </div>

      <div className="fixed bottom-4 right-4 z-[60] space-y-2 print:hidden">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              dismissToast(t.id);
              router.push("/demo/orders?status=New");
            }}
            className="flex items-center gap-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg px-4 py-3 text-left"
          >
            <span className="w-7 h-7 rounded-lg bg-[#5E8E3E] flex items-center justify-center text-xs font-bold">S</span>
            {t.text}
          </button>
        ))}
      </div>
    </div>
  );
}
