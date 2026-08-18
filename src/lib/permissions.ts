export const MODULES = [
  { key: "dashboard",      label: "Dashboard",          href: "/",                yesNo: true  },
  { key: "clients",        label: "Clients",             href: "/clients",         yesNo: false },
  { key: "leads",          label: "Leads / CRM",         href: "/leads",           yesNo: false },
  { key: "sales",          label: "Sales & Invoices",    href: "/sales/invoices",  yesNo: false },
  { key: "dispatch",       label: "Dispatch",            href: "/dispatch",        yesNo: false },
  { key: "samples",        label: "Samples",             href: "/samples",         yesNo: false },
  { key: "finance",        label: "Finance",             href: "/finance",         yesNo: false },
  { key: "retail",         label: "Retail / COD",        href: "/retail",          yesNo: false },
  { key: "reorder",        label: "Reorder / Followup",  href: "/reorder",         yesNo: false },
  { key: "performance",    label: "Performance",         href: "/performance",     yesNo: false },
  { key: "complaints",     label: "Complaints",          href: "/complaints",      yesNo: false },
  { key: "messages",       label: "Messages",            href: "/messages",        yesNo: true  },
  { key: "commission",     label: "Commission",          href: "/commission",      yesNo: false },
  { key: "emp_commission", label: "My Commission",       href: "/emp-commission",  yesNo: true  },
  { key: "ecommerce",      label: "Ecommerce",           href: "/ecommerce",       yesNo: false },
  { key: "bug_reports",    label: "Bug Reports",         href: "/bug-reports",     yesNo: true  },
] as const;

export const SUB_MODULES = [
  // Clients
  { parentKey: "clients",     key: "clients_add",                label: "Add Customer"          },

  // Leads
  { parentKey: "leads",       key: "leads_not_contacted",        label: "Not Contacted"         },
  { parentKey: "leads",       key: "leads_contacted",            label: "Contacted"             },
  { parentKey: "leads",       key: "leads_sample_sent",          label: "Samples"               },
  { parentKey: "leads",       key: "leads_cancelled",            label: "Cancelled"             },
  { parentKey: "leads",       key: "leads_add",                  label: "Add Shop"              },

  // Sales
  { parentKey: "sales",       key: "sales_invoices",             label: "Invoicing"             },
  { parentKey: "sales",       key: "sales_products",             label: "Products"              },

  // Dispatch
  { parentKey: "dispatch",    key: "dispatch_main",              label: "Pending Dispatch"      },
  { parentKey: "dispatch",    key: "dispatch_history",           label: "Dispatched History"    },

  // Samples
  { parentKey: "samples",     key: "samples_list",               label: "View Samples"          },
  { parentKey: "samples",     key: "samples_add",                label: "Add Sample"            },

  // Finance
  { parentKey: "finance",     key: "finance_main",               label: "Finance"               },
  { parentKey: "finance",     key: "finance_commission",         label: "Commission"            },

  // Retail
  { parentKey: "retail",      key: "retail_overview",            label: "Overview"              },
  { parentKey: "retail",      key: "retail_orders",              label: "Orders"                },
  { parentKey: "retail",      key: "retail_new_order",           label: "New Order"             },
  { parentKey: "retail",      key: "retail_drafts",              label: "Drafts"                },
  { parentKey: "retail",      key: "retail_customers",           label: "Customers"             },
  { parentKey: "retail",      key: "retail_finance",             label: "Finance"               },
  { parentKey: "retail",      key: "retail_calculator",          label: "Rate Calculator"       },
  { parentKey: "retail",      key: "retail_dispatch",            label: "Dispatch"              },
  { parentKey: "retail",      key: "retail_record_payment",      label: "Record Payment"        },
  { parentKey: "retail",      key: "retail_set_courier",         label: "Set Delivery Charges"  },
  { parentKey: "retail",      key: "retail_see_charges",         label: "See Charges"           },

  // Reorder / Followup
  { parentKey: "reorder",     key: "reorder_dashboard",          label: "Dashboard"             },
  { parentKey: "reorder",     key: "reorder_campaigns",          label: "Campaigns"             },
  { parentKey: "reorder",     key: "reorder_audit",              label: "Audit Log"             },
  { parentKey: "reorder",     key: "reorder_retail_followup",    label: "Retail Followup"       },

  // Performance
  { parentKey: "performance", key: "performance_main",           label: "Overview"              },
  { parentKey: "performance", key: "performance_log",            label: "Call Log"              },
  { parentKey: "performance", key: "performance_report",         label: "Report"                },
  { parentKey: "performance", key: "performance_targets",        label: "Targets"               },

  // Complaints
  { parentKey: "complaints",  key: "complaints_list",            label: "View Complaints"       },
  { parentKey: "complaints",  key: "complaints_add",             label: "Submit Complaint"      },

  // Commission
  { parentKey: "commission",  key: "commission_view",            label: "View Rates"            },
  { parentKey: "commission",  key: "commission_manage",          label: "Manage Commission"     },

  // Ecommerce
  { parentKey: "ecommerce",   key: "ecom_orders",                label: "Orders"                },
  { parentKey: "ecommerce",   key: "ecom_customers",             label: "Customers"             },
  { parentKey: "ecommerce",   key: "ecom_finance",               label: "Finance"               },
  { parentKey: "ecommerce",   key: "ecom_expenses",              label: "Expenses"              },
  { parentKey: "ecommerce",   key: "ecom_cpr",                   label: "CPR / PostEx"          },
  { parentKey: "ecommerce",   key: "ecom_import",                label: "Import Orders"         },
] as const;

export type SubModuleKey = (typeof SUB_MODULES)[number]["key"];
export type ModuleKey = (typeof MODULES)[number]["key"];
export type AccessLevel = "none" | "view" | "full";
export type UserPermissions = Record<ModuleKey, AccessLevel> & { sub?: Partial<Record<SubModuleKey, boolean>> };

export const ALL_MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);
export const ALL_SUB_KEYS: SubModuleKey[] = SUB_MODULES.map((s) => s.key);

export const EMPTY_PERMISSIONS: UserPermissions = {
  dashboard:      "none",
  clients:        "none",
  leads:          "none",
  sales:          "none",
  dispatch:       "none",
  samples:        "none",
  finance:        "none",
  retail:         "none",
  reorder:        "none",
  performance:    "none",
  complaints:     "none",
  messages:       "none",
  commission:     "none",
  emp_commission: "none",
  ecommerce:      "none",
  bug_reports:    "none",
};

export const FULL_PERMISSIONS: UserPermissions = {
  dashboard:      "view",
  clients:        "full",
  leads:          "full",
  sales:          "full",
  dispatch:       "full",
  samples:        "full",
  finance:        "full",
  retail:         "full",
  reorder:        "full",
  performance:    "full",
  complaints:     "full",
  messages:       "view",
  commission:     "full",
  emp_commission: "view",
  ecommerce:      "full",
  bug_reports:    "view",
};

export function parsePermissions(raw: unknown): UserPermissions {
  const base: UserPermissions = { ...EMPTY_PERMISSIONS };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const key of ALL_MODULE_KEYS) {
      const v = obj[key];
      if (v === "view" || v === "full") base[key] = v;
    }
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

export function canViewSub(perms: UserPermissions, subKey: SubModuleKey, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!perms.sub || Object.keys(perms.sub).length === 0) return true;
  return perms.sub[subKey] === true;
}

export function canDoSub(perms: UserPermissions, subKey: SubModuleKey, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return perms.sub?.[subKey] === true;
}
