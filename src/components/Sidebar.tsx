"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import InstallPwaButton from "@/components/InstallPwaButton";
import { canView, canViewSub, type UserPermissions, EMPTY_PERMISSIONS } from "@/lib/permissions";

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
  phone: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M4 3h3l1.5 4-2 1.5a9 9 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A14 14 0 0 1 4 6.6 1.5 1.5 0 0 1 4 3Z"
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
  retail: (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <path d="M3 7h14l-1.5 8.5a1 1 0 0 1-1 .5H5.5a1 1 0 0 1-1-.5L3 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7l1.5-3.5h11L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7v4M12 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export default function Sidebar({
  businessName,
  isAdmin = false,
  mobileOpen,
  onMobileClose,
  permissions = EMPTY_PERMISSIONS,
}: {
  businessName: string;
  isAdmin?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  permissions?: UserPermissions;
}) {
  const pathname = usePathname();
  const isOnWholesale = pathname.startsWith("/clients") || pathname.startsWith("/sales") || pathname.startsWith("/finance") || pathname.startsWith("/commission") || pathname.startsWith("/sales/orders") || pathname.startsWith("/dispatch");
  const isOnRetail = pathname.startsWith("/retail");
  const isOnLeads = pathname.startsWith("/leads");
  const isOnEcommerce = pathname.startsWith("/ecommerce");
  const isOnEmployee = pathname.startsWith("/emp-commission") || pathname.startsWith("/performance");
  const isOnReorder = pathname.startsWith("/reorder");

  type Section = "wholesale" | "retail" | "leads" | "ecommerce" | "employee" | "reorder" | null;
  function sectionForPath(): Section {
    if (isOnWholesale) return "wholesale";
    if (isOnRetail) return "retail";
    if (isOnLeads) return "leads";
    if (isOnEcommerce) return "ecommerce";
    if (isOnEmployee) return "employee";
    if (isOnReorder) return "reorder";
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

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <NavLink href="/" active={isActive("/")} icon={icons.dashboard} onClick={closeMobile}>
          Dashboard
        </NavLink>

        {(canView(permissions, "clients", isAdmin) || canView(permissions, "sales", isAdmin) || canView(permissions, "finance", isAdmin)) && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("wholesale")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isOnWholesale ? "bg-zinc-900/8 text-zinc-900 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2.5">{icons.clients} Wholesale</span>
              <span className={`transition-transform text-gray-400 ${openSection === "wholesale" ? "rotate-90" : ""}`}>{icons.chevron}</span>
            </button>
            {openSection === "wholesale" && (
              <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
                {canView(permissions, "clients", isAdmin) && (
                  <NavLink href="/clients" active={pathname.startsWith("/clients")} compact onClick={closeMobile}>Customers</NavLink>
                )}
                {canView(permissions, "sales", isAdmin) && canViewSub(permissions, "sales_invoices", isAdmin) && (
                  <NavLink href="/sales/invoices" active={pathname.startsWith("/sales/invoices")} compact onClick={closeMobile}>Invoicing</NavLink>
                )}
                {canView(permissions, "sales", isAdmin) && (
                  <NavLink href="/sales/orders" active={pathname.startsWith("/sales/orders")} compact onClick={closeMobile}>Orders</NavLink>
                )}
                {canView(permissions, "finance", isAdmin) && canView(permissions, "commission", isAdmin) && canViewSub(permissions, "finance_commission", isAdmin) && (
                  <NavLink href="/commission" active={pathname.startsWith("/commission")} compact onClick={closeMobile}>Commission</NavLink>
                )}
                {canView(permissions, "sales", isAdmin) && canViewSub(permissions, "sales_products", isAdmin) && (
                  <NavLink href="/sales/products" active={pathname.startsWith("/sales/products")} compact onClick={closeMobile}>Products</NavLink>
                )}
                {canView(permissions, "finance", isAdmin) && canViewSub(permissions, "finance_main", isAdmin) && (
                  <NavLink href="/finance" active={pathname.startsWith("/finance")} compact onClick={closeMobile}>Finance</NavLink>
                )}
                {canView(permissions, "dispatch", isAdmin) && (
                  <NavLink href="/dispatch" active={isActive("/dispatch")} compact onClick={closeMobile}>Dispatch</NavLink>
                )}
              </div>
            )}
          </>
        )}

        {canView(permissions, "retail", isAdmin) && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("retail")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isOnRetail ? "bg-zinc-900/8 text-zinc-900 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2.5">{icons.retail} Retail Advance</span>
              <span className={`transition-transform text-gray-400 ${openSection === "retail" ? "rotate-90" : ""}`}>{icons.chevron}</span>
            </button>
            {openSection === "retail" && (
              <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
                {canViewSub(permissions, "retail_overview", isAdmin) && (
                  <NavLink href="/retail" active={pathname === "/retail"} compact onClick={closeMobile}>Overview</NavLink>
                )}
                {canViewSub(permissions, "retail_orders", isAdmin) && (
                  <NavLink href="/retail/orders" active={pathname.startsWith("/retail/orders")} compact onClick={closeMobile}>Orders</NavLink>
                )}
                {canViewSub(permissions, "retail_customers", isAdmin) && (
                  <NavLink href="/retail/customers" active={pathname.startsWith("/retail/customers")} compact onClick={closeMobile}>Customers</NavLink>
                )}
                {canViewSub(permissions, "retail_finance", isAdmin) && (
                  <NavLink href="/retail/finance" active={pathname.startsWith("/retail/finance")} compact onClick={closeMobile}>Finance</NavLink>
                )}
                {canViewSub(permissions, "retail_dispatch", isAdmin) && (
                  <NavLink href="/retail/dispatch" active={pathname.startsWith("/retail/dispatch")} compact onClick={closeMobile}>Dispatch</NavLink>
                )}
                <NavLink href="/retail/drafts" active={pathname.startsWith("/retail/drafts")} compact onClick={closeMobile}>Draft Orders</NavLink>
{isAdmin && (
                  <NavLink href="/retail/cpr" active={pathname.startsWith("/retail/cpr")} compact onClick={closeMobile}>CPR Import</NavLink>
                )}
              </div>
            )}
          </>
        )}

        {canView(permissions, "reorder", isAdmin) && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("reorder")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isOnReorder ? "bg-zinc-900/8 text-zinc-900 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
                  <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="16" cy="5.5" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="10" r="1.5" fill="currentColor" />
                </svg>
                Reorder Calls
              </span>
              <span className={`transition-transform text-gray-400 ${openSection === "reorder" ? "rotate-90" : ""}`}>{icons.chevron}</span>
            </button>
            {openSection === "reorder" && (
              <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
                {canViewSub(permissions, "reorder_campaigns", isAdmin) && (
                  <NavLink href="/reorder" active={pathname === "/reorder"} compact onClick={closeMobile}>Campaigns</NavLink>
                )}
                {canViewSub(permissions, "reorder_retail_followup", isAdmin) && (
                  <NavLink href="/reorder/retail-followup" active={pathname.startsWith("/reorder/retail-followup")} compact onClick={closeMobile}>Retail Follow-up</NavLink>
                )}
                {canViewSub(permissions, "reorder_dashboard", isAdmin) && (
                  <NavLink href="/reorder/dashboard" active={pathname.startsWith("/reorder/dashboard")} compact onClick={closeMobile}>Dashboard</NavLink>
                )}
                {canViewSub(permissions, "reorder_audit", isAdmin) && (
                  <NavLink href="/reorder/audit" active={pathname.startsWith("/reorder/audit")} compact onClick={closeMobile}>Audit Log</NavLink>
                )}
              </div>
            )}
          </>
        )}


        {canView(permissions, "ecommerce", isAdmin) && (
          <>
            <button type="button" onClick={() => toggleSection("ecommerce")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${isOnEcommerce ? "bg-zinc-900/8 text-zinc-900 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}>
              <span className="flex items-center gap-2.5">{icons.retail} Retail COD</span>
              <span className={`transition-transform text-gray-400 ${openSection === "ecommerce" ? "rotate-90" : ""}`}>{icons.chevron}</span>
            </button>
            {openSection === "ecommerce" && (
              <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
                <NavLink href="/ecommerce/shopify-orders" active={pathname.startsWith("/ecommerce/shopify-orders")} compact onClick={closeMobile}>Draft Orders</NavLink>
                {canViewSub(permissions, "ecom_orders", isAdmin) && (
                  <NavLink href="/ecommerce/orders" active={pathname.startsWith("/ecommerce/orders")} compact onClick={closeMobile}>Confirm Orders</NavLink>
                )}
                {canViewSub(permissions, "ecom_customers", isAdmin) && (
                  <NavLink href="/ecommerce/customers" active={pathname.startsWith("/ecommerce/customers")} compact onClick={closeMobile}>Customers</NavLink>
                )}
                {canViewSub(permissions, "ecom_finance", isAdmin) && (
                  <NavLink href="/ecommerce/finance" active={pathname.startsWith("/ecommerce/finance")} compact onClick={closeMobile}>Finance</NavLink>
                )}
                {canViewSub(permissions, "ecom_expenses", isAdmin) && (
                  <NavLink href="/ecommerce/expenses" active={pathname.startsWith("/ecommerce/expenses")} compact onClick={closeMobile}>Expenses</NavLink>
                )}
                {isAdmin && (
                  <NavLink href="/ecommerce/cpr" active={pathname.startsWith("/ecommerce/cpr")} compact onClick={closeMobile}>CPR Settlement</NavLink>
                )}
                {isAdmin && (
                  <NavLink href="/ecommerce/settings" active={pathname.startsWith("/ecommerce/settings")} compact onClick={closeMobile}>Settings</NavLink>
                )}
              </div>
            )}
          </>
        )}


        {canView(permissions, "leads", isAdmin) && (
          <>
            <button
              type="button"
              onClick={() => toggleSection("leads")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isOnLeads ? "bg-zinc-900/8 text-zinc-900 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2.5">{icons.leads} Leads</span>
              <span className={`transition-transform text-gray-400 ${openSection === "leads" ? "rotate-90" : ""}`}>{icons.chevron}</span>
            </button>
            {openSection === "leads" && (
              <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
                <NavLink href="/leads" active={pathname === "/leads"} compact onClick={closeMobile}>All Shops</NavLink>
                {canViewSub(permissions, "leads_not_contacted", isAdmin) && (
                  <NavLink href="/leads/not-contacted" active={pathname.startsWith("/leads/not-contacted")} compact onClick={closeMobile}>Not Contacted</NavLink>
                )}
                {canViewSub(permissions, "leads_contacted", isAdmin) && (
                  <NavLink href="/leads/contacted" active={pathname.startsWith("/leads/contacted")} compact onClick={closeMobile}>Contacted</NavLink>
                )}
                {canViewSub(permissions, "leads_sample_sent", isAdmin) && (
                  <NavLink href="/leads/sample-sent" active={pathname.startsWith("/leads/sample-sent")} compact onClick={closeMobile}>Samples</NavLink>
                )}
                {canViewSub(permissions, "leads_add", isAdmin) && (
                  <NavLink href="/leads/new" active={pathname === "/leads/new"} icon={icons.plus} compact onClick={closeMobile}>Add Shop</NavLink>
                )}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => toggleSection("employee")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${isOnEmployee ? "bg-zinc-900/8 text-zinc-900 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
        >
          <span className="flex items-center gap-2.5">{icons.finance} Employee</span>
          <span className={`transition-transform text-gray-400 ${openSection === "employee" ? "rotate-90" : ""}`}>{icons.chevron}</span>
        </button>
        {openSection === "employee" && (
          <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 py-0.5">
            <NavLink href="/work" active={pathname.startsWith("/work")} compact onClick={closeMobile}>
              My Work
            </NavLink>
            {canView(permissions, "emp_commission", isAdmin) && (
              <NavLink href="/emp-commission" active={isActive("/emp-commission")} compact onClick={closeMobile}>
                {isAdmin ? "Commission" : "My Commission"}
              </NavLink>
            )}
            {canView(permissions, "performance", isAdmin) && (
              <NavLink href="/performance" active={pathname.startsWith("/performance")} compact onClick={closeMobile}>
                Performance
              </NavLink>
            )}
          </div>
        )}

        {isAdmin && <SectionLabel>Admin</SectionLabel>}

        {isAdmin && (
          <NavLink
            href="/admin/tasks"
            active={pathname.startsWith("/admin/tasks")}
            icon={icons.users}
            onClick={closeMobile}
          >
            Assign Tasks
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            href="/settings"
            active={isActive("/settings") && !pathname.startsWith("/settings/users")}
            icon={icons.settings}
            onClick={closeMobile}
          >
            Settings
          </NavLink>
        )}
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
        {canView(permissions, "employee_call_verification", isAdmin) && (
          <NavLink
            href="/employee-call-verification"
            active={pathname.startsWith("/employee-call-verification")}
            icon={icons.phone}
            onClick={closeMobile}
          >
            Employee Call Verification
          </NavLink>
        )}
        {canView(permissions, "complaints", isAdmin) && (
          <NavLink
            href="/complaints"
            active={pathname.startsWith("/complaints")}
            icon={icons.sales}
            onClick={closeMobile}
          >
            Complaints
          </NavLink>
        )}
        {canView(permissions, "bug_reports", isAdmin) && (
          <NavLink
            href="/bug-reports"
            active={pathname.startsWith("/bug-reports")}
            icon={icons.sales}
            onClick={closeMobile}
          >
            Bug Reports
          </NavLink>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5 shrink-0">
        <InstallPwaButton />
        <p className="px-3 py-1.5 text-xs text-gray-400">ASAAD ERP · v1.0</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen border-r border-gray-100 bg-white print:hidden sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

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
