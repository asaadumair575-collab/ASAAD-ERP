import { canView, canViewSub, type ModuleKey, type SubModuleKey, type UserPermissions } from "@/lib/permissions";

export type AccessPageConfig = {
  key: string;
  label: string;
  module: ModuleKey;
  sub?: SubModuleKey;
  // Extra modules that must also be "view" for this page to actually show
  // (mirrors compound AND conditions in the sidebar, e.g. Commission needs
  // both the commission module and finance).
  alsoModules?: ModuleKey[];
  // Visually clusters this page under a sub-heading within the card,
  // mirroring the sidebar's own nested groups (e.g. Analytics, Orders).
  // Pages with no group render in the plain top-level grid.
  group?: string;
};

export type AccessModuleConfig = {
  key: string;
  title: string;
  description: string;
  pages: AccessPageConfig[];
};

// One entry per sidebar section. Each page here maps 1:1 onto how the
// Sidebar actually gates that link (see src/components/Sidebar.tsx) — keep
// these two in sync when a page's gating changes.
export const ACCESS_MODULES: AccessModuleConfig[] = [
  {
    key: "general",
    title: "General",
    description: "Core pages every account may or may not need",
    pages: [
      { key: "dashboard", label: "Dashboard", module: "dashboard" },
      { key: "messages", label: "Messages", module: "messages" },
      { key: "bug_reports", label: "Bug Reports", module: "bug_reports" },
      { key: "employee_call_verification", label: "Employee Call Verification", module: "employee_call_verification" },
    ],
  },
  {
    key: "wholesale",
    title: "Wholesale",
    description: "Which wholesale pages this user can see",
    pages: [
      { key: "customers", label: "Customers", module: "clients" },
      { key: "invoicing", label: "Invoicing", module: "sales", sub: "sales_invoices" },
      { key: "orders", label: "Orders", module: "sales", sub: "sales_orders" },
      { key: "products", label: "Products", module: "sales", sub: "sales_products" },
      { key: "finance", label: "Finance", module: "finance", sub: "finance_main" },
      { key: "commission", label: "Commission", module: "commission", sub: "finance_commission", alsoModules: ["finance"] },
      { key: "dispatch", label: "Dispatch", module: "dispatch" },
    ],
  },
  {
    key: "retail",
    title: "Retail Advance",
    description: "Which Retail Advance pages this user can see",
    pages: [
      { key: "overview", label: "Overview", module: "retail", sub: "retail_overview" },
      { key: "orders", label: "Orders", module: "retail", sub: "retail_orders" },
      { key: "customers", label: "Customers", module: "retail", sub: "retail_customers" },
      { key: "finance", label: "Finance", module: "retail", sub: "retail_finance" },
      { key: "dispatch", label: "Dispatch", module: "retail", sub: "retail_dispatch" },
    ],
  },
  {
    key: "reorder",
    title: "Reorder Calls",
    description: "Which Reorder Calls pages this user can see",
    pages: [
      { key: "campaigns", label: "Campaigns", module: "reorder", sub: "reorder_campaigns" },
      { key: "retail_followup", label: "Retail Follow-up", module: "reorder", sub: "reorder_retail_followup" },
      { key: "dashboard", label: "Dashboard", module: "reorder", sub: "reorder_dashboard" },
      { key: "audit", label: "Audit Log", module: "reorder", sub: "reorder_audit" },
    ],
  },
  {
    key: "leads",
    title: "Leads",
    description: "Which Leads pages this user can see",
    pages: [
      { key: "all_shops", label: "All Shops", module: "leads" },
      { key: "contacted", label: "Contacted", module: "leads", sub: "leads_contacted" },
      { key: "samples", label: "Samples", module: "leads", sub: "leads_sample_sent" },
      { key: "add_shop", label: "Add Shop", module: "leads", sub: "leads_add" },
    ],
  },
  {
    key: "employee",
    title: "Employee",
    description: "Commission and Performance access (My Work is always visible)",
    pages: [
      { key: "commission", label: "Commission", module: "emp_commission" },
      { key: "performance", label: "Performance", module: "performance" },
    ],
  },
  {
    key: "ecommerce",
    title: "Retail COD",
    description: "Which Retail COD pages this user can see",
    pages: [
      { key: "dashboard", label: "All Dashboard", module: "ecommerce", sub: "ecom_all_dashboard" },
      { key: "ads", label: "Ads Manager", module: "ecommerce", sub: "ecom_analytics_ads", group: "Analytics" },
      { key: "postex", label: "Postex Analytics", module: "ecommerce", sub: "ecom_analytics_postex", group: "Analytics" },
      { key: "website", label: "Website", module: "ecommerce", sub: "ecom_analytics_website", group: "Analytics" },
      { key: "draft", label: "Draft Orders", module: "ecommerce", sub: "ecom_draft_orders", group: "Orders" },
      { key: "orders", label: "Orders", module: "ecommerce", sub: "ecom_orders", group: "Orders" },
      { key: "all_orders", label: "All Orders", module: "ecommerce", sub: "ecom_all_orders", group: "Orders" },
      { key: "dispatch", label: "Dispatch", module: "ecommerce", sub: "ecom_dispatch", group: "Orders" },
      { key: "book_postex", label: "Book on Postex", module: "ecommerce", sub: "ecom_book_postex", group: "Orders" },
      { key: "customers", label: "Customers", module: "ecommerce", sub: "ecom_customers" },
      { key: "finance", label: "Finance", module: "ecommerce", sub: "ecom_finance" },
      { key: "expenses", label: "Expenses", module: "ecommerce", sub: "ecom_expenses" },
    ],
  },
  {
    key: "complaints",
    title: "Complaints",
    description: "Access to the Complaints section",
    pages: [
      { key: "complaints", label: "Complaints", module: "complaints" },
    ],
  },
];

export function computeInitial(config: AccessModuleConfig, perms: UserPermissions): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const p of config.pages) {
    const moduleOk =
      canView(perms, p.module, false) &&
      (!p.alsoModules || p.alsoModules.every((m) => canView(perms, m, false)));
    result[p.key] = p.sub ? moduleOk && canViewSub(perms, p.sub, false) : moduleOk;
  }
  return result;
}
