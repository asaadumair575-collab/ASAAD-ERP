import { after } from "next/server";
import AppShell from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_NAME, daysLeft, fmtDate, msSince, timeAgo } from "@/lib/format";
import { refreshTracking } from "@/lib/shipping";
import { syncStore } from "@/lib/shopify";
import { logout } from "../login/actions";

export const maxDuration = 60;

const SYNC_EVERY_MIN = 10;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [newOrders, shopify] = await Promise.all([
    db.order.count({ where: { tenantId: user.tenantId, status: "NEW" } }),
    db.shopifyConnection.findUnique({ where: { tenantId: user.tenantId }, select: { lastSyncAt: true, syncError: true } }),
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
  const planName = user.tenant.isDemo ? "Demo account" : `${user.tenant.plan.charAt(0)}${user.tenant.plan.slice(1).toLowerCase()} plan`;
  const info = {
    appName: APP_NAME,
    storeName: user.tenant.name,
    userName: user.name,
    role: user.role === "OWNER" ? "Owner" : "Staff",
    newOrders,
    shopify: !shopify && user.tenant.isDemo ? "demo store data" : shopify ? (shopify.syncError ? "sync error" : shopify.lastSyncAt ? `synced ${timeAgo(shopify.lastSyncAt)}` : "connected") : null,
    plan: {
      label: `${planName} · Active`,
      note: left === null ? "No end date" : left <= 0 ? "Ends today" : `${left} day${left === 1 ? "" : "s"} left · ends ${fmtDate(user.tenant.expiresAt!)}`,
      warn: left !== null && left <= 3,
    },
  };
  return (
    <AppShell info={info} logout={logout}>
      {left !== null && left <= 3 && (
        <div className="mb-6 rounded-2xl bg-gray-950 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span><b>{planName}</b> — {left <= 0 ? "ends today" : `${left} day${left === 1 ? "" : "s"} left`}. Your data stays safe; contact us to continue without a break.</span>
        </div>
      )}
      {children}
    </AppShell>
  );
}
