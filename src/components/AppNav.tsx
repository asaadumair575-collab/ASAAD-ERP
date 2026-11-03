"use client";

import { BarChart3, Boxes, LayoutDashboard, Menu, Plug, Settings, ShoppingCart, Truck, Users, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/orders", label: "Orders", icon: ShoppingCart },
  { href: "/app/shipments", label: "Shipments", icon: Truck },
  { href: "/app/inventory", label: "Inventory", icon: Boxes },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/cod", label: "COD & Profit", icon: Wallet },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/integrations", label: "Integrations", icon: Plug },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export default function AppNav({ newOrders, storeName }: { newOrders: number; storeName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  const links = (
    <nav className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${active(href) ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
        >
          <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">{label}</span>
          {href === "/app/orders" && newOrders > 0 && <span className="text-xs font-medium text-gray-700 bg-gray-200 rounded px-1.5">{newOrders}</span>}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="h-14 flex items-center px-4 border-b border-gray-200"><Logo small /></div>
        <div className="p-3 flex-1 overflow-y-auto">
          <p className="px-2.5 pb-2 text-xs text-gray-400 truncate">{storeName}</p>
          {links}
        </div>
      </aside>
      <button type="button" onClick={() => setOpen(true)} className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-md bg-white border border-gray-200" aria-label="Menu">
        <Menu className="w-4 h-4" />
      </button>
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)}>
          <div className="w-64 h-full bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 px-1">
              <Logo small />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            {links}
          </div>
        </div>
      )}
    </>
  );
}
