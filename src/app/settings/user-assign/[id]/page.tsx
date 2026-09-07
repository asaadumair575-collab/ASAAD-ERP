import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { parsePermissions, canView, canViewSub } from "@/lib/permissions";
import { updateWholesaleAccess } from "@/lib/actions";
import ModuleAccessCard from "@/components/ModuleAccessCard";

const WHOLESALE_PAGES = [
  { key: "wh_customers", label: "Customers" },
  { key: "wh_invoicing", label: "Invoicing" },
  { key: "wh_orders", label: "Orders" },
  { key: "wh_products", label: "Products" },
  { key: "wh_finance", label: "Finance" },
  { key: "wh_commission", label: "Commission" },
  { key: "wh_dispatch", label: "Dispatch" },
];

// Modules get added here one at a time — each is its own ModuleAccessCard
// with its own page list, its own bound save action, and its own mapping
// onto the underlying permissions storage (see updateWholesaleAccess for
// the pattern to follow for the next one).
const MODULES_BUILT = ["wholesale"];
const MODULES_PLANNED = ["Retail COD", "Leads", "Reorder / Followup", "Performance", "Complaints", "Employee"];

export default async function UserAssignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  const { id } = await params;
  const { saved } = await searchParams;
  const userId = parseInt(id, 10);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const perms = parsePermissions(user.permissions);

  const wholesaleInitial: Record<string, boolean> = {
    wh_customers: canView(perms, "clients", false),
    wh_invoicing: canView(perms, "sales", false) && canViewSub(perms, "sales_invoices", false),
    wh_orders: canView(perms, "sales", false) && canViewSub(perms, "sales_orders", false),
    wh_products: canView(perms, "sales", false) && canViewSub(perms, "sales_products", false),
    wh_finance: canView(perms, "finance", false) && canViewSub(perms, "finance_main", false),
    wh_commission: canView(perms, "commission", false) && canViewSub(perms, "finance_commission", false),
    wh_dispatch: canView(perms, "dispatch", false),
  };

  const saveWholesaleAccess = updateWholesaleAccess.bind(null, userId);

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/settings/user-assign" className="text-gray-400 hover:text-black transition-colors">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.displayName ?? user.username}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            @{user.username}
            {user.mustSetPassword ? (
              <span className="ml-2 text-amber-600 font-medium">· hasn&apos;t set a password yet</span>
            ) : (
              <span className="ml-2 text-green-600 font-medium">· active</span>
            )}
          </p>
        </div>
      </div>

      {saved === "1" && (
        <div className="border border-green-200 bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700">
          ✓ Access saved.
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          Modules ({MODULES_BUILT.length} of {MODULES_BUILT.length + MODULES_PLANNED.length} set up)
        </p>
        <div className="space-y-4">
          <ModuleAccessCard
            title="Wholesale"
            description="Which wholesale pages this user can see"
            pages={WHOLESALE_PAGES}
            initial={wholesaleInitial}
            action={saveWholesaleAccess}
          />
        </div>
      </div>

      <div className="border border-dashed border-gray-200 rounded-2xl p-6">
        <p className="text-sm font-medium text-gray-500 mb-2.5">Coming next</p>
        <div className="flex flex-wrap gap-1.5">
          {MODULES_PLANNED.map((m) => (
            <span key={m} className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
