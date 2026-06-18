"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M3 10.5 10 4l7 6.5M5 9v6.5a.5.5 0 0 0 .5.5H8a.5.5 0 0 0 .5-.5V13a1.5 1.5 0 0 1 3 0v2.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .5-.5V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M13 9c1.4 0 2.5-1.1 2.5-2.5S14.4 4 13 4M16 16c0-2-1.3-3.4-3-3.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  sales: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M3 16.5h14M5 16.5V11l3-2 3 2.5 3-4v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5.1 5.1l1.1 1.1M13.8 13.8l1.1 1.1M14.9 5.1l-1.1 1.1M6.2 13.8l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
      <path
        d="M7 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export default function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const isOnClients = pathname.startsWith("/clients");
  const [clientsOpen, setClientsOpen] = useState(isOnClients);
  const isOnSales = pathname.startsWith("/sales");
  const [salesOpen, setSalesOpen] = useState(isOnSales);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-60 shrink-0 bg-black text-white min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-lg font-semibold tracking-tight">
          {businessName}
        </span>
        <p className="text-xs text-gray-500 mt-0.5">Business Manager</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink href="/" active={isActive("/")} icon={icons.dashboard}>
          Dashboard
        </NavLink>
        <button
          type="button"
          onClick={() => setClientsOpen((o) => !o)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isOnClients
              ? "bg-white/10 text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {icons.clients}
            Customers
          </span>
          <span
            className={`transition-transform ${clientsOpen ? "rotate-90" : ""}`}
          >
            {icons.chevron}
          </span>
        </button>
        {clientsOpen && (
          <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
            <NavLink
              href="/clients"
              active={pathname === "/clients"}
              compact
            >
              All Customers
            </NavLink>
            <NavLink
              href="/clients/new"
              active={pathname === "/clients/new"}
              icon={icons.plus}
              compact
            >
              Add Customer
            </NavLink>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSalesOpen((o) => !o)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isOnSales
              ? "bg-white/10 text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {icons.sales}
            Sales
          </span>
          <span
            className={`transition-transform ${salesOpen ? "rotate-90" : ""}`}
          >
            {icons.chevron}
          </span>
        </button>
        {salesOpen && (
          <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
            <NavLink
              href="/sales/invoices"
              active={pathname.startsWith("/sales/invoices")}
              compact
            >
              Invoicing
            </NavLink>
            <NavLink
              href="/sales/products"
              active={pathname.startsWith("/sales/products")}
              compact
            >
              Products
            </NavLink>
          </div>
        )}

        <NavLink
          href="/settings"
          active={isActive("/settings")}
          icon={icons.settings}
        >
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}

function NavLink({
  href,
  active,
  icon,
  compact,
  children,
}: {
  href: string;
  active: boolean;
  icon?: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg text-sm transition-colors ${
        compact ? "px-3 py-1.5" : "px-3 py-2"
      } ${
        active
          ? "bg-white text-black font-medium"
          : "text-gray-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
