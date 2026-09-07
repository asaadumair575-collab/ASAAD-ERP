import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { parsePermissions, canView, canViewSub } from "@/lib/permissions";
import WholesaleAccessForm from "./WholesaleAccessForm";

export default async function UserAssignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  const { id } = await params;
  const userId = parseInt(id, 10);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const perms = parsePermissions(user.permissions);

  const initial = {
    wh_customers: canView(perms, "clients", false),
    wh_invoicing: canView(perms, "sales", false) && canViewSub(perms, "sales_invoices", false),
    wh_orders: canView(perms, "sales", false),
    wh_products: canView(perms, "sales", false) && canViewSub(perms, "sales_products", false),
    wh_finance: canView(perms, "finance", false) && canViewSub(perms, "finance_main", false),
    wh_commission: canView(perms, "commission", false) && canViewSub(perms, "finance_commission", false),
    wh_dispatch: canView(perms, "dispatch", false),
  };

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

      <WholesaleAccessForm userId={user.id} initial={initial} />

      <div className="border border-dashed border-gray-200 rounded-2xl p-10 text-center">
        <p className="text-sm font-medium text-gray-400">Other modules coming next</p>
      </div>
    </div>
  );
}
