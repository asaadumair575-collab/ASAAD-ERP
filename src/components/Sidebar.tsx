"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/actions";
import InstallPwaButton from "@/components/InstallPwaButton";

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
  users: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M15 8v4M13 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
  finance: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M10 2v16M14 5.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  samples: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M6.5 2.5h7l1 4-4.5 11-4.5-11 1-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.5 2.5h7M5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  dispatch: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M2.5 6.5 10 2.5l7.5 4M2.5 6.5v7l7.5 4 7.5-4v-7M2.5 6.5 10 10.5l7.5-4M10 10.5V17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M3 5.5a2 2 0 0 1 2-2h6l4 4v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 3.5V8h4M7 11.5h6M7 14.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
  menu: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path
        d="M3 6h14M3 10h14M3 14h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M7.5 17.5h-3a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1h3M13 14l4-4-4-4M17 10H7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export default function Sidebar({ businessName, isAdmin = false }: { businessName: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const isOnClients = pathname.startsWith("/clients");
  const isOnSales = pathname.startsWith("/sales");
  const isOnFinance =
    pathname.startsWith("/finance") || pathname.startsWith("/commission");
  const isOnLeads = pathname.startsWith("/leads");

  type Section = "clients" | "sales" | "finance" | null;
  function sectionForPath(): Section {
    if (isOnClients) return "clients";
    if (isOnSales) return "sales";
    if (isOnFinance) return "finance";
    return null;
  }
  const [openSection, setOpenSection] = useState<Section>(sectionForPath());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

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

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-black text-white px-4 py-3 print:hidden">
        <span className="font-semibold tracking-tight">{businessName}</span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-1.5 rounded-lg hover:bg-white/10"
        >
          {icons.menu}
        </button>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      <button
        type="button"
        onClick={() => setDesktopOpen((v) => !v)}
        aria-label={desktopOpen ? "Collapse sidebar" : "Expand sidebar"}
        className={`hidden md:flex fixed top-7 z-50 items-center justify-center w-6 h-6 rounded-full bg-white text-black shadow-md ring-1 ring-black/5 hover:bg-gray-100 hover:scale-105 transition-all duration-300 ease-in-out ${
          desktopOpen ? "left-[233px]" : "left-3"
        }`}
      >
        <span
          className={`transition-transform duration-300 ${desktopOpen ? "rotate-180" : ""}`}
        >
          {icons.chevron}
        </span>
      </button>

      <aside
        className={`sidebar-scroll fixed md:sticky inset-y-0 md:inset-y-auto top-0 left-0 z-50 shrink-0 bg-black text-white flex flex-col h-screen overflow-y-auto transform transition-all duration-300 ease-in-out print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${
          desktopOpen ? "w-60" : "md:w-0 md:overflow-hidden"
        } w-60`}
      >
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between whitespace-nowrap">
          <div>
            <span className="text-lg font-semibold tracking-tight">
              {businessName}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">Business Manager</p>
          </div>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10"
          >
            {icons.close}
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 whitespace-nowrap">
          <NavLink
            href="/"
            active={isActive("/")}
            icon={icons.dashboard}
            onClick={closeMobile}
          >
            Dashboard
          </NavLink>
          <button
            type="button"
            onClick={() => toggleSection("clients")}
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
              className={`transition-transform ${openSection === "clients" ? "rotate-90" : ""}`}
            >
              {icons.chevron}
            </span>
          </button>
          {openSection === "clients" && (
            <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
              <NavLink
                href="/clients"
                active={pathname === "/clients"}
                compact
                onClick={closeMobile}
              >
                All Customers
              </NavLink>
              <NavLink
                href="/clients/new"
                active={pathname === "/clients/new"}
                icon={icons.plus}
                compact
                onClick={closeMobile}
              >
                Add Customer
              </NavLink>
            </div>
          )}

          <button
            type="button"
            onClick={() => toggleSection("sales")}
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
              className={`transition-transform ${openSection === "sales" ? "rotate-90" : ""}`}
            >
              {icons.chevron}
            </span>
          </button>
          {openSection === "sales" && (
            <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
              <NavLink
                href="/sales/invoices"
                active={pathname.startsWith("/sales/invoices")}
                compact
                onClick={closeMobile}
              >
                Invoicing
              </NavLink>
              <NavLink
                href="/sales/products"
                active={pathname.startsWith("/sales/products")}
                compact
                onClick={closeMobile}
              >
                Products
              </NavLink>
            </div>
          )}

          <button
            type="button"
            onClick={() => toggleSection("finance")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              isOnFinance
                ? "bg-white/10 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              {icons.finance}
              Finance
            </span>
            <span
              className={`transition-transform ${openSection === "finance" ? "rotate-90" : ""}`}
            >
              {icons.chevron}
            </span>
          </button>
          {openSection === "finance" && (
            <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
              <NavLink
                href="/finance"
                active={pathname.startsWith("/finance")}
                compact
                onClick={closeMobile}
              >
                My Business
              </NavLink>
              <NavLink
                href="/commission"
                active={pathname.startsWith("/commission")}
                compact
                onClick={closeMobile}
              >
                Commission
              </NavLink>
            </div>
          )}

          <NavLink
            href="/leads"
            active={isOnLeads && pathname !== "/leads/new"}
            icon={icons.leads}
            onClick={closeMobile}
          >
            Leads
          </NavLink>
          <NavLink
            href="/leads/new"
            active={pathname === "/leads/new"}
            icon={icons.plus}
            onClick={closeMobile}
          >
            Add Shop
          </NavLink>

          <NavLink
            href="/dispatch"
            active={isActive("/dispatch")}
            icon={icons.dispatch}
            onClick={closeMobile}
          >
            Dispatch
          </NavLink>

          <NavLink
            href="/samples"
            active={isActive("/samples")}
            icon={icons.samples}
            onClick={closeMobile}
          >
            Samples
          </NavLink>

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

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <InstallPwaButton />
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {icons.logout}
              Logout
            </button>
          </form>
        </div>
      </aside>
    </>
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
          ? "bg-white text-black font-medium"
          : "text-gray-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
