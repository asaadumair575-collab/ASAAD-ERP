import RemitTable from "@/components/RemitTable";
import { Card, CardHeader, Empty, PageHeader, Stat, Table, Tabs, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { fmtDate, money, daysAgo } from "@/lib/format";
import { profitSummary } from "@/lib/profit";
import { Banknote, Clock, Truck, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function CodPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const view = (await searchParams).view === "received" ? "received" : "pending";
  const t = user.tenantId;
  const since = daysAgo(30);

  const [byCourier, list, p] = await Promise.all([
    db.shipment.groupBy({ by: ["courier", "status", "codRemitted"], where: { tenantId: t, codAmount: { gt: 0 } }, _sum: { codAmount: true }, _count: true }),
    db.shipment.findMany({
      where: { tenantId: t, status: "DELIVERED", codAmount: { gt: 0 }, codRemitted: view === "received" },
      orderBy: { deliveredAt: "desc" },
      take: 200,
      include: { order: { select: { number: true, customerName: true } } },
    }),
    profitSummary(t, since),
  ]);

  const sum = (f: (r: (typeof byCourier)[number]) => boolean) => byCourier.filter(f).reduce((a, r) => a + (r._sum.codAmount ?? 0), 0);
  const received = sum((r) => r.status === "DELIVERED" && r.codRemitted);
  const pending = sum((r) => r.status === "DELIVERED" && !r.codRemitted);
  const transit = sum((r) => ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(r.status));
  const couriers = [...new Set(byCourier.map((r) => r.courier))];

  return (
    <div className="space-y-6">
      <PageHeader title="COD & Profit" description="Track cash collected by couriers and what you actually earn." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Banknote} chip="green" label="COD received" value={money(received)} tone="good" hint="In your account" />
        <Stat icon={Clock} chip="amber" label="Delivered, payment pending" value={money(pending)} tone={pending ? "warn" : undefined} hint="Couriers owe you" />
        <Stat icon={Truck} chip="blue" label="COD in transit" value={money(transit)} hint="Not delivered yet" />
        <Stat icon={TrendingUp} label="Net profit (30 days)" value={money(p.net)} tone={p.net >= 0 ? "good" : "bad"} hint={p.revenue ? `${((p.net / p.revenue) * 100).toFixed(1)}% margin` : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="By courier" />
          {couriers.length ? (
            <Table>
              <thead><tr><Th>Courier</Th><Th right>Received</Th><Th right>Pending</Th><Th right>In transit</Th></tr></thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c}>
                    <Td className="font-medium">{courierName(c)}</Td>
                    <Td right className="text-green-700">{money(sum((r) => r.courier === c && r.status === "DELIVERED" && r.codRemitted))}</Td>
                    <Td right className="text-amber-700">{money(sum((r) => r.courier === c && r.status === "DELIVERED" && !r.codRemitted))}</Td>
                    <Td right>{money(sum((r) => r.courier === c && ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(r.status)))}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <p className="p-4 text-sm text-gray-500">No COD parcels yet.</p>}
        </Card>
        <Card>
          <CardHeader title="Profit — last 30 days" action={<Link href="/app/help#profit" className="text-xs text-gray-500 hover:text-gray-950">How is this worked out?</Link>} />
          <div className="px-5 pb-5 text-sm space-y-2.5">
            <div className="flex justify-between"><span className="text-gray-600">Delivered sales ({p.deliveredCount} orders)</span><span className="tabular-nums font-medium">{money(p.revenue)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Product cost</span><span className="tabular-nums">− {money(p.productCost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Courier charges</span><span className="tabular-nums">− {money(p.shipping)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Returns ({p.returnedCount} parcels)</span><span className="tabular-nums">− {money(p.returnLoss)}</span></div>
            <div className="flex justify-between pt-2.5 border-t border-gray-100"><span className="text-gray-900 font-medium">Gross profit</span><span className="tabular-nums font-medium">{money(p.gross)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Expenses (ads, packaging…) <Link href="/app/expenses" className="text-gray-950 underline">edit</Link></span><span className="tabular-nums">− {money(p.expenses)}</span></div>
            <div className="flex justify-between items-center rounded-xl bg-gray-950 text-white px-4 py-3 mt-2"><span className="font-semibold">Net profit</span><span className="tabular-nums text-lg font-bold">{money(p.net)}</span></div>
            {p.missingCost && <p className="text-xs text-amber-700 pt-1">Some products have no cost set — add costs in <Link href="/app/inventory" className="underline">Inventory</Link> for an exact profit.</p>}
          </div>
        </Card>
      </div>

      <div>
        <Tabs active={view} tabs={[{ key: "pending", label: "Payment pending", href: "/app/cod" }, { key: "received", label: "Payment received", href: "/app/cod?view=received" }]} />
        <Card>
          {list.length === 0 ? (
            <Empty title={view === "pending" ? "Nothing pending" : "No payments marked yet"}>{view === "pending" ? "All delivered COD has been received." : undefined}</Empty>
          ) : (
            <RemitTable
              rows={list.map((s) => ({
                id: s.id,
                tracking: s.trackingNumber,
                order: s.order.number,
                customer: s.order.customerName,
                courier: courierName(s.courier),
                deliveredAt: s.deliveredAt ? fmtDate(s.deliveredAt) : "—",
                cod: money(s.codAmount),
                remitted: s.codRemitted,
              }))}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
