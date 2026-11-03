import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import ResetPasswordButton from "@/components/ResetPasswordButton";
import { Badge, Card, CardHeader, PageHeader, Stat, btn, inputCls } from "@/components/ui";
import { accessProblem } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { daysLeft, fmtDate, fmtDateTime, money } from "@/lib/format";
import { deleteAccount, endAccessNow, extendAccess, resetOwnerPassword, setSuspended, updateAccount } from "../../../actions";

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const t = await db.tenant.findUnique({
    where: { id },
    include: { users: { orderBy: { createdAt: "asc" } }, shopify: true, couriers: { select: { courier: true } } },
  });
  if (!t) notFound();
  const [orders, revenue] = await Promise.all([
    db.order.count({ where: { tenantId: id } }),
    db.order.aggregate({ where: { tenantId: id, status: "DELIVERED" }, _sum: { total: true } }),
  ]);
  const owner = t.users.find((u) => u.role === "OWNER");
  const problem = accessProblem(t);
  const d = daysLeft(t.expiresAt);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Accounts</Link>
      <PageHeader
        title={t.name}
        description={<>Created {fmtDate(t.createdAt)}{t.isDemo && " · Demo account with sample data"}</>}
        actions={
          problem === "suspended" ? <Badge>Paused</Badge> : problem === "expired" ? <Badge className="bg-red-50 text-red-700 ring-red-200">Access ended</Badge> : <Badge className="bg-green-50 text-green-700 ring-green-200">Active</Badge>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Access" value={d === null ? "No end date" : d < 0 ? "Ended" : `${d} day${d === 1 ? "" : "s"} left`} hint={t.expiresAt ? `Until ${fmtDateTime(t.expiresAt)}` : undefined} />
        <Stat label="Orders" value={orders} />
        <Stat label="Delivered revenue" value={money(revenue._sum.total ?? 0)} />
        <Stat label="Shopify" value={t.shopify ? "Connected" : "Not connected"} hint={t.shopify?.shopDomain} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Access" />
          <div className="p-4 space-y-4">
            <form action={extendAccess.bind(null, t.id)} className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Add time</span>
                <select name="days" defaultValue="3" className={`${inputCls} w-44`}>
                  <option value="1">+1 day</option>
                  <option value="3">+3 days</option>
                  <option value="4">+4 days</option>
                  <option value="7">+7 days</option>
                  <option value="30">+30 days (1 month)</option>
                  <option value="365">+365 days (1 year)</option>
                  <option value="0">Remove end date</option>
                </select>
              </label>
              <button className={btn("primary")}>Update access</button>
            </form>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <form action={setSuspended.bind(null, t.id, t.status !== "SUSPENDED")}>
                <button className={btn("secondary", "sm")}>{t.status === "SUSPENDED" ? "Resume account" : "Pause account"}</button>
              </form>
              {!problem && (
                <form action={endAccessNow.bind(null, t.id)}>
                  <ConfirmButton message="End this account's access now?" className={btn("secondary", "sm")}>End access now</ConfirmButton>
                </form>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <form action={updateAccount.bind(null, t.id)} className="p-4 space-y-3">
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">Store name</span><input name="name" defaultValue={t.name} className={inputCls} /></label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Plan</span>
              <select name="plan" defaultValue={t.plan} className={inputCls}>
                <option value="TRIAL">Trial / Demo</option><option value="STARTER">Starter</option><option value="GROWTH">Growth</option><option value="PRO">Pro</option>
              </select>
            </label>
            <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">Notes</span><textarea name="notes" defaultValue={t.notes ?? ""} rows={2} className={`${inputCls} h-auto py-2`} /></label>
            <button className={btn("primary", "sm")}>Save</button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Owner login" />
          <div className="p-4 space-y-2 text-sm">
            <p><span className="text-gray-500">Name: </span>{owner?.name}</p>
            <p><span className="text-gray-500">Email: </span>{owner?.email}</p>
            <p><span className="text-gray-500">Last login: </span>{owner?.lastLoginAt ? fmtDateTime(owner.lastLoginAt) : "Never"}</p>
            {owner && <div className="pt-2"><ResetPasswordButton action={resetOwnerPassword.bind(null, owner.id, t.id)} /></div>}
            {t.users.length > 1 && <p className="text-gray-500 pt-2">{t.users.length - 1} staff user{t.users.length > 2 ? "s" : ""}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Connections" />
          <div className="p-4 text-sm space-y-2">
            <p><span className="text-gray-500">Shopify: </span>{t.shopify ? `${t.shopify.shopDomain} · last sync ${t.shopify.lastSyncAt ? fmtDateTime(t.shopify.lastSyncAt) : "never"}` : "Not connected"}</p>
            <p><span className="text-gray-500">Couriers: </span>{t.couriers.length ? t.couriers.map((c) => courierName(c.courier)).join(", ") : "None"}</p>
          </div>
        </Card>
      </div>

      <Card className="border-red-200">
        <CardHeader title="Delete account" />
        <form action={deleteAccount.bind(null, t.id)} className="p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Permanently deletes this store, its users, orders, shipments and connections.</p>
          <ConfirmButton message={`Delete ${t.name} and all its data? This cannot be undone.`} className={btn("danger", "sm")}>Delete account</ConfirmButton>
        </form>
      </Card>
    </div>
  );
}
