import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { parsePermissions, canView, canViewSub } from "@/lib/permissions";
import { updateWholesaleAccess } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

const WHOLESALE_PAGES = [
  { key: "wh_customers", label: "Customers" },
  { key: "wh_invoicing", label: "Invoicing" },
  { key: "wh_orders", label: "Orders" },
  { key: "wh_products", label: "Products" },
  { key: "wh_finance", label: "Finance" },
  { key: "wh_commission", label: "Commission" },
  { key: "wh_dispatch", label: "Dispatch" },
];

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

  const initial: Record<string, boolean> = {
    wh_customers: canView(perms, "clients", false),
    wh_invoicing: canView(perms, "sales", false) && canViewSub(perms, "sales_invoices", false),
    wh_orders: canView(perms, "sales", false),
    wh_products: canView(perms, "sales", false) && canViewSub(perms, "sales_products", false),
    wh_finance: canView(perms, "finance", false) && canViewSub(perms, "finance_main", false),
    wh_commission: canView(perms, "commission", false) && canViewSub(perms, "finance_commission", false),
    wh_dispatch: canView(perms, "dispatch", false),
  };

  const saveWholesaleAccess = updateWholesaleAccess.bind(null, userId);

  return (
    <div className="max-w-3xl space-y-6">
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

      <form action={saveWholesaleAccess} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Wholesale</p>
          <p className="text-xs text-gray-400 mt-0.5">Which wholesale pages this user can see</p>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WHOLESALE_PAGES.map((p) => (
            <label
              key={p.key}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 has-checked:border-black has-checked:bg-black has-checked:text-white cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                name={p.key}
                value="1"
                defaultChecked={initial[p.key]}
                className="w-3.5 h-3.5 accent-black rounded"
              />
              <span className="text-sm font-medium">{p.label}</span>
            </label>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
          <SubmitButton
            pendingText="Saving..."
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Save Access
          </SubmitButton>
        </div>
      </form>

      <div className="border border-dashed border-gray-200 rounded-2xl p-10 text-center">
        <p className="text-sm font-medium text-gray-400">Other modules coming next</p>
      </div>
    </div>
  );
}
