"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import InstallPwaButton from "@/components/InstallPwaButton";

const icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M3 10.5 10 4l7 6.5M5 9v6.5a.5.5 0 0 0 .5.5H8a.5.5 0 0 0 .5-.5V13a1.5 1.5 0 0 1 3 0v2.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .5-.5V9"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M13 9c1.4 0 2.5-1.1 2.5-2.5S14.4 4 13 4M16 16c0-2-1.3-3.4-3-3.9"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  sales: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M3 16.5h14M5 16.5V11l3-2 3 2.5 3-4v9"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 8v4M13 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5.1 5.1l1.1 1.1M13.8 13.8l1.1 1.1M14.9 5.1l-1.1 1.1M6.2 13.8l-1.1 1.1"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M10 2v16M14 5.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  samples: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M6.5 2.5h7l1 4-4.5 11-4.5-11 1-4Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2.5h7M5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  dispatch: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M2.5 6.5 10 2.5l7.5 4M2.5 6.5v7l7.5 4 7.5-4v-7M2.5 6.5 10 10.5l7.5-4M10 10.5V17.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M3 5.5a2 2 0 0 1 2-2h6l4 4v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10.5Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 3.5V8h4M7 11.5h6M7 14.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 shrink-0">
      <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 shrink-0">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M2.5 4.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 5.5 10 11l7.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function Sidebar({
  businessName,
  isAdmin = false,
  mobileOpen,
  onMobileClose,
  unreadMessages = 0,
}: {
  businessName: string;
  isAdmin?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const isOnClients = pathname.startsWith("/clients");
  const isOnSales = pathname.startsWith("/sales");
  const isOnFinance = pathname.startsWith("/finance") || pathname.startsWith("/commission");
  const isOnLeads = pathname.startsWith("/leads");

  type Section = "clients" | "sales" | "finance" | "leads" | null;
  function sectionForPath(): Section {
    if (isOnClients) return "clients";
    if (isOnSales) return "sales";
    if (isOnFinance) return "finance";
    if (isOnLeads) return "leads";
    return null;
  }
  const [openSection, setOpenSection] = useState<Section>(sectionForPath());

  useEffect(() => {
    setOpenSection(sectionForPath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleSection(section: Section) {
    setOpenSection((current) => (current === section ? null : section));
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const closeMobile = () => onMobileClose?.();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-white">
              <path d="M3 10.5 10 4l7 6.5M5 9v6.5a.5.5 0 0 0 .5.5H8a.5.5 0 0 0 .5-.5V13a1.5 1.5 0 0 1 3 0v2.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .5-.5V9"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900 truncate">{businessName}</span>
        </div>
        <button
          type="button"
          onClick={closeMobile}
          aria-label="Close menu"
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          {icons.close}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <NavLink href="/" active={isActive("/")} icon={icons.dashboard} onClick={closeMobile}>
          Dashboard
        </NavLink>

        <SectionLabel>Operations</SectionLabel>

        {/* Customers */}
        <button
          type="button"
          onClick={() => toggleSection("clients")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isOnClients
              ? "bg-zinc-900/8 text-zinc-900 font-medium"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {icons.clients}
            Customers
          </span>
          <span className={`transition-transform text-gray-400 ${openSection === "clients" ? "rotate-90" : ""}`}>
            {icons.chevron}
          </span>
        </button>
        {openSection === "clients" && (
          <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
            <NavLink href="/clients" active={pathname === "/clients"} compact onClick={closeMobile}>
              All Customers
            </NavLink>
            <NavLink href="/clients/new" active={pathname === "/clients/new"} icon={icons.plus} compact onClick={closeMobile}>
              Add Customer
            </NavLink>
          </div>
        )}

        {/* Sales */}
        <button
          type="button"
          onClick={() => toggleSection("sales")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isOnSales
              ? "bg-zinc-900/8 text-zinc-900 font-medium"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {icons.sales}
            Sales
          </span>
          <span className={`transition-transform text-gray-400 ${openSection === "sales" ? "rotate-90" : ""}`}>
            {icons.chevron}
          </span>
        </button>
        {openSection === "sales" && (
          <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
            <NavLink href="/sales/invoices" active={pathname.startsWith("/sales/invoices")} compact onClick={closeMobile}>
              Invoicing
            </NavLink>
            <NavLink href="/sales/products" active={pathname.startsWith("/sales/products")} compact onClick={closeMobile}>
              Products
            </NavLink>
          </div>
        )}

        {/* Finance */}
        <button
          type="button"
          onClick={() => toggleSection("finance")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isOnFinance
              ? "bg-zinc-900/8 text-zinc-900 font-medium"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {icons.finance}
            Finance
          </span>
          <span className={`transition-transform text-gray-400 ${openSection === "finance" ? "rotate-90" : ""}`}>
            {icons.chevron}
          </span>
        </button>
        {openSection === "finance" && (
          <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
            <NavLink href="/finance" active={pathname.startsWith("/finance")} compact onClick={closeMobile}>
              My Business
            </NavLink>
            <NavLink href="/commission" active={pathname.startsWith("/commission")} compact onClick={closeMobile}>
              Commission
            </NavLink>
          </div>
        )}

        <SectionLabel>CRM</SectionLabel>

        {/* Leads */}
        <button
          type="button"
          onClick={() => toggleSection("leads")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isOnLeads
              ? "bg-zinc-900/8 text-zinc-900 font-medium"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {icons.leads}
            Leads
          </span>
          <span className={`transition-transform text-gray-400 ${openSection === "leads" ? "rotate-90" : ""}`}>
            {icons.chevron}
          </span>
        </button>
        {openSection === "leads" && (
          <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
            <NavLink href="/leads" active={pathname === "/leads"} compact onClick={closeMobile}>
              All Shops
            </NavLink>
            <NavLink href="/leads/not-contacted" active={pathname.startsWith("/leads/not-contacted")} compact onClick={closeMobile}>
              Not Contacted
            </NavLink>
            <NavLink href="/leads/contacted" active={pathname.startsWith("/leads/contacted")} compact onClick={closeMobile}>
              Contacted
            </NavLink>
            <NavLink href="/leads/sample-sent" active={pathname.startsWith("/leads/sample-sent")} compact onClick={closeMobile}>
              Samples
            </NavLink>
            <NavLink href="/leads/new" active={pathname === "/leads/new"} icon={icons.plus} compact onClick={closeMobile}>
              Add Shop
            </NavLink>
          </div>
        )}

        <NavLink href="/dispatch" active={isActive("/dispatch")} icon={icons.dispatch} onClick={closeMobile}>
          Dispatch
        </NavLink>

        {/* Messages */}
        <Link
          href="/messages"
          onClick={closeMobile}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname.startsWith("/messages")
              ? "bg-zinc-900 text-white font-medium"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {icons.messages}
            Messages
          </span>
          {unreadMessages > 0 && (
            <span className={`min-w-[18px] h-[18px] text-[10px] font-semibold rounded-full flex items-center justify-center px-1 ${
              pathname.startsWith("/messages") ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"
            }`}>
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          )}
        </Link>

        <SectionLabel>Admin</SectionLabel>

        <NavLink
          href="/settings"
          active={isActive("/settings") && !pathname.startsWith("/settings/users")}
          icon={icons.settings}
          onClick={closeMobile}
        >
          Settings
        </NavLink>
        {isAdmin && (
          <NavLink
            href="/settings/users"
            active={pathname.startsWith("/settings/users")}
            icon={icons.users}
            onClick={closeMobile}
          >
            Users
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5 shrink-0">
        <InstallPwaButton />
        <p className="px-3 py-1.5 text-xs text-gray-400">ASAAD ERP · v1.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen border-r border-gray-100 bg-white print:hidden sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile off-canvas drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col md:hidden transform transition-transform duration-300 ease-in-out print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 select-none">
      {children}
    </p>
  );
}

function NavLink({
  href,
  active,
  icon,
  compact,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  icon?: React.ReactNode;
  compact?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg text-sm transition-colors ${
        compact ? "px-3 py-1.5" : "px-3 py-2"
      } ${
        active
          ? "bg-zinc-900 text-white font-medium"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
