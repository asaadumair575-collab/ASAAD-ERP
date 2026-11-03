import Link from "next/link";
import CreateAccountForm from "@/components/CreateAccountForm";
import { Badge, Card, CardHeader, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { accessProblem } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_NAME, daysLeft, fmtDate } from "@/lib/format";
import { appUrl } from "@/lib/shopify";
import { createAccount } from "../actions";

export default async function AdminHome() {
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { where: { role: "OWNER" }, take: 1, select: { email: true, lastLoginAt: true } },
      shopify: { select: { shopDomain: true } },
      _count: { select: { orders: true } },
    },
  });
  const active = tenants.filter((t) => !accessProblem(t)).length;
  const expiringSoon = tenants.filter((t) => {
    const d = daysLeft(t.expiresAt);
    return d !== null && d >= 0 && d <= 2 && t.status === "ACTIVE";
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Create store accounts, give demo access for a few days, and manage subscriptions." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total accounts" value={tenants.length} />
        <Stat label="Active" value={active} />
        <Stat label="Demo accounts" value={tenants.filter((t) => t.isDemo).length} />
        <Stat label="Ending in 2 days" value={expiringSoon} tone={expiringSoon ? "warn" : undefined} hint={expiringSoon ? "Follow up with these" : undefined} />
      </div>

      <Card>
        <CardHeader title="New account" />
        <div className="p-4">
          <CreateAccountForm action={createAccount} loginUrl={`${appUrl()}/login`} appName={APP_NAME} />
        </div>
      </Card>

      <Card>
        <CardHeader title={`All accounts (${tenants.length})`} />
        <Table>
          <thead>
            <tr><Th>Store</Th><Th>Owner</Th><Th>Plan</Th><Th>Access</Th><Th>Shopify</Th><Th right>Orders</Th><Th>Last login</Th></tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const problem = accessProblem(t);
              const d = daysLeft(t.expiresAt);
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <Td>
                    <Link href={`/admin/accounts/${t.id}`} className="font-medium text-gray-900 hover:underline">{t.name}</Link>
                    {t.isDemo && <span className="ml-2"><Badge>Demo</Badge></span>}
                  </Td>
                  <Td className="text-gray-600">{t.users[0]?.email ?? "—"}</Td>
                  <Td className="text-gray-600">{t.plan.charAt(0) + t.plan.slice(1).toLowerCase()}</Td>
                  <Td>
                    {problem === "suspended" ? (
                      <Badge className="bg-gray-100 text-gray-600 ring-gray-200">Paused</Badge>
                    ) : problem === "expired" ? (
                      <Badge className="bg-red-50 text-red-700 ring-red-200">Ended {fmtDate(t.expiresAt!)}</Badge>
                    ) : d === null ? (
                      <Badge className="bg-green-50 text-green-700 ring-green-200">No end date</Badge>
                    ) : (
                      <Badge className={d <= 2 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-green-50 text-green-700 ring-green-200"}>{d} day{d === 1 ? "" : "s"} left</Badge>
                    )}
                  </Td>
                  <Td className="text-gray-600">{t.shopify?.shopDomain ?? "—"}</Td>
                  <Td right>{t._count.orders}</Td>
                  <Td className="text-gray-500">{t.users[0]?.lastLoginAt ? fmtDate(t.users[0].lastLoginAt) : "Never"}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
