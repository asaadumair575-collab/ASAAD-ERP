export const MODULES = [
  { key: "dashboard",  label: "Dashboard",         href: "/",               yesNo: true  },
  { key: "clients",    label: "Clients",            href: "/clients",        yesNo: false },
  { key: "leads",      label: "Leads / CRM",        href: "/leads",          yesNo: false },
  { key: "sales",      label: "Sales & Invoices",   href: "/sales/invoices", yesNo: false },
  { key: "dispatch",   label: "Dispatch",           href: "/dispatch",       yesNo: false },
  { key: "samples",    label: "Samples",            href: "/samples",        yesNo: false },
  { key: "finance",    label: "Finance",            href: "/finance",        yesNo: false },
  { key: "retail",     label: "Retail / COD",       href: "/retail",         yesNo: false },
  { key: "commission", label: "Commission",         href: "/commission",     yesNo: false },
] as const;

// Sub-pages within each module dropdown
export const SUB_MODULES = [
  { parentKey: "clients", key: "clients_add",          label: "Add Customer"    },
  { parentKey: "sales",   key: "sales_invoices",       label: "Invoicing"       },
  { parentKey: "sales",   key: "sales_products",       label: "Products"        },
  { parentKey: "finance", key: "finance_main",         label: "Finance"         },
  { parentKey: "finance", key: "finance_commission",   label: "Commission"      },
  { parentKey: "retail",  key: "retail_overview",      label: "Overview"        },
  { parentKey: "retail",  key: "retail_orders",        label: "Orders"          },
  { parentKey: "retail",  key: "retail_completed",     label: "Completed"       },
  { parentKey: "retail",  key: "retail_customers",     label: "Customers"       },
  { parentKey: "retail",  key: "retail_finance",       label: "Finance"         },
  { parentKey: "retail",  key: "retail_calculator",    label: "Rate Calculator" },
  { parentKey: "leads",   key: "leads_not_contacted",  label: "Not Contacted"   },
  { parentKey: "leads",   key: "leads_contacted",      label: "Contacted"       },
  { parentKey: "leads",   key: "leads_sample_sent",    label: "Samples"         },
  { parentKey: "leads",   key: "leads_add",            label: "Add Shop"        },
] as const;

export type SubModuleKey = (typeof SUB_MODULES)[number]["key"];
export type ModuleKey = (typeof MODULES)[number]["key"];
export type AccessLevel = "none" | "view" | "full";
export type UserPermissions = Record<ModuleKey, AccessLevel> & { sub?: Partial<Record<SubModuleKey, boolean>> };

export const ALL_MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);
export const ALL_SUB_KEYS: SubModuleKey[] = SUB_MODULES.map((s) => s.key);

export const EMPTY_PERMISSIONS: UserPermissions = {
  dashboard:  "none",
  clients:    "none",
  leads:      "none",
  sales:      "none",
  dispatch:   "none",
  samples:    "none",
  finance:    "none",
  retail:     "none",
  commission: "none",
};

export const FULL_PERMISSIONS: UserPermissions = {
  dashboard:  "view",
  clients:    "full",
  leads:      "full",
  sales:      "full",
  dispatch:   "full",
  samples:    "full",
  finance:    "full",
  retail:     "full",
  commission: "full",
};

export function parsePermissions(raw: unknown): UserPermissions {
  const base: UserPermissions = { ...EMPTY_PERMISSIONS };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const key of ALL_MODULE_KEYS) {
      const v = obj[key];
      if (v === "view" || v === "full") base[key] = v;
    }
    // Parse sub-permissions
    if (obj.sub && typeof obj.sub === "object" && !Array.isArray(obj.sub)) {
      const sub: Partial<Record<SubModuleKey, boolean>> = {};
      const rawSub = obj.sub as Record<string, unknown>;
      for (const key of ALL_SUB_KEYS) {
        if (rawSub[key] === true) sub[key] = true;
      }
      base.sub = sub;
    }
  }
  return base;
}

export function canView(perms: UserPermissions, module: ModuleKey, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return perms[module] === "view" || perms[module] === "full";
}

export function canManage(perms: UserPermissions, module: ModuleKey, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return perms[module] === "full";
}

// Returns true if user can see this sub-page.
// If no sub-permissions set at all, defaults to true (backward compat).
export function canViewSub(perms: UserPermissions, subKey: SubModuleKey, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!perms.sub || Object.keys(perms.sub).length === 0) return true;
  return perms.sub[subKey] === true;
}
