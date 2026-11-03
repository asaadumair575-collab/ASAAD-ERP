import RemitTable from "@/components/RemitTable";
import { Card, CardHeader, Empty, PageHeader, Stat, Table, Tabs, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { fmtDate, money, daysAgo } from "@/lib/format";

export default async function CodPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const view = (await searchParams).view === "received" ? "received" : "pending";
  const t = user.tenantId;
  const since = daysAgo(30);

  const [byCourier, list, delivered30, returned30] = await Promise.all([
    db.shipment.groupBy({ by: ["courier", "status", "codRemitted"], where: { tenantId: t, codAmount: { gt: 0 } }, _sum: { codAmount: true }, _count: true }),
    db.shipment.findMany({
      where: { tenantId: t, status: "DELIVERED", codAmount: { gt: 0 }, codRemitted: view === "received" },
      orderBy: { deliveredAt: "desc" },
      take: 200,
      include: { order: { select: { number: true, customerName: true } } },
    }),
    db.order.findMany({
      where: { tenantId: t, status: "DELIVERED", placedAt: { gte: since } },
      select: { total: true, shipment: { select: { courierCharge: true } }, items: { select: { qty: true, product: { select: { cost: true } } } } },
    }),
    db.shipment.aggregate({ where: { tenantId: t, status: "RETURNED", bookedAt: { gte: since } }, _sum: { courierCharge: true }, _count: true }),
  ]);

  const sum = (f: (r: (typeof byCourier)[number]) => boolean) => byCourier.filter(f).reduce((a, r) => a + (r._sum.codAmount ?? 0), 0);
  const received = sum((r) => r.status === "DELIVERED" && r.codRemitted);
  const pending = sum((r) => r.status === "DELIVERED" && !r.codRemitted);
  const transit = sum((r) => ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(r.status));
  const couriers = [...new Set(byCourier.map((r) => r.courier))];

  const revenue = delivered30.reduce((a, o) => a + o.total, 0);
  const productCost = delivered30.reduce((a, o) => a + o.items.reduce((s, i) => s + i.qty * (i.product?.cost ?? 0), 0), 0);
  const missingCost = delivered30.some((o) => o.items.some((i) => i.product?.cost == null));
  const shipping = delivered30.reduce((a, o) => a + (o.shipment?.courierCharge ?? 0), 0);
  const returnLoss = returned30._sum.courierCharge ?? 0;
  const profit = revenue - productCost - shipping - returnLoss;

  return (
    <div className="space-y-6">
      <PageHeader title="COD & Profit" description="Track cash collected by couriers and what you actually earn." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="COD received" value={money(received)} tone="good" hint="Paid into your account" />
        <Stat label="Delivered, payment pending" value={money(pending)} tone={pending ? "warn" : undefined} hint="Couriers still owe you" />
        <Stat label="COD in transit" value={money(transit)} hint="Parcels not delivered yet" />
        <Stat label="Profit (30 days)" value={money(profit)} tone={profit >= 0 ? "good" : "bad"} hint={revenue ? `${((profit / revenue) * 100).toFixed(1)}% of delivered sales` : undefined} />
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
          <CardHeader title="Profit — last 30 days" />
          <div className="p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-600">Delivered sales</span><span className="tabular-nums">{money(revenue)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Product cost</span><span className="tabular-nums">− {money(productCost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Courier charges</span><span className="tabular-nums">− {money(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Returns ({returned30._count} parcels)</span><span className="tabular-nums">− {money(returnLoss)}</span></div>
            <div className="flex justify-between font-semibold pt-2 border-t border-gray-100"><span>Profit</span><span className="tabular-nums">{money(profit)}</span></div>
            {missingCost && <p className="text-xs text-amber-700 pt-1">Some products have no cost set — add costs in Inventory for an exact profit.</p>}
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
