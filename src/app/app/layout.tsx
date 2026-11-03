import { after } from "next/server";
import AppNav from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysLeft, msSince } from "@/lib/format";
import { refreshTracking } from "@/lib/shipping";
import { syncStore } from "@/lib/shopify";
import { logout } from "../login/actions";

export const maxDuration = 60;

const SYNC_EVERY_MIN = 10;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [newOrders, shopify] = await Promise.all([
    db.order.count({ where: { tenantId: user.tenantId, status: "NEW" } }),
    db.shopifyConnection.findUnique({ where: { tenantId: user.tenantId }, select: { lastSyncAt: true } }),
  ]);

  // Keep data fresh while people use the app: pull new Shopify orders and
  // courier updates in the background after the page is sent.
  after(async () => {
    if (shopify && (!shopify.lastSyncAt || msSince(shopify.lastSyncAt) > SYNC_EVERY_MIN * 60000)) {
      await syncStore(user.tenantId).catch(() => null);
    }
    await refreshTracking(user.tenantId, { staleMinutes: 120, limit: 25 }).catch(() => null);
  });

  const left = daysLeft(user.tenant.expiresAt);
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppNav newOrders={newOrders} storeName={user.tenant.name} />
      <div className="flex-1 flex flex-col min-w-0">
        {left !== null && left <= 7 && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
            {user.tenant.isDemo ? "Demo account" : "Your plan"} — {left <= 0 ? "ends today" : `${left} day${left === 1 ? "" : "s"} left`}. Contact us to continue.
          </div>
        )}
        <header className="h-14 shrink-0 flex items-center justify-end gap-4 px-4 sm:px-6 bg-white border-b border-gray-200">
          <span className="text-sm text-gray-600 hidden sm:inline">{user.name}</span>
          <form action={logout}><button className="text-sm text-gray-500 hover:text-gray-900">Sign out</button></form>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
