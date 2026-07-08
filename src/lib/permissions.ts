export const MODULES = [
  { key: "dashboard",  label: "Dashboard",         href: "/",               yesNo: true  },
  { key: "clients",    label: "Clients",            href: "/clients",        yesNo: false },
  { key: "leads",      label: "Leads / CRM",        href: "/leads",          yesNo: false },
  { key: "sales",      label: "Sales & Invoices",   href: "/sales/invoices", yesNo: false },
  { key: "dispatch",   label: "Dispatch",           href: "/dispatch",       yesNo: false },
  { key: "samples",    label: "Samples",            href: "/samples",        yesNo: false },
  { key: "finance",    label: "Finance",            href: "/finance",        yesNo: false },
  { key: "commission", label: "Commission",         href: "/commission",     yesNo: false },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export type AccessLevel = "none" | "view" | "full";
export type UserPermissions = Record<ModuleKey, AccessLevel>;

export const ALL_MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

export const EMPTY_PERMISSIONS: UserPermissions = {
  dashboard:  "none",
  clients:    "none",
  leads:      "none",
  sales:      "none",
  dispatch:   "none",
  samples:    "none",
  finance:    "none",
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
  commission: "full",
};

export function parsePermissions(raw: unknown): UserPermissions {
  const base = { ...EMPTY_PERMISSIONS };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const key of ALL_MODULE_KEYS) {
      const v = obj[key];
      if (v === "view" || v === "full") base[key] = v;
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
