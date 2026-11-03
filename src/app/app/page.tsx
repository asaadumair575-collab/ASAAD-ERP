import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import OrdersChart from "@/components/OrdersChart";
import { Card, CardHeader, LinkButton, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { money, daysAgo, msSince } from "@/lib/format";

const DAY = 86400000;
const pkDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

export default async function Dashboard() {
  const user = await requireUser();
  const t = user.tenantId;
  const since = daysAgo(30);

  const [orders, toProcess, shopify, couriers, inTransit, lowStock] = await Promise.all([
    db.order.findMany({ where: { tenantId: t, placedAt: { gte: since } }, select: { placedAt: true, total: true, status: true, city: true } }),
    db.order.groupBy({ by: ["status"], where: { tenantId: t, status: { in: ["NEW", "CONFIRMED"] } }, _count: true }),
    db.shopifyConnection.findUnique({ where: { tenantId: t }, select: { shopDomain: true } }),
    db.courierAccount.count({ where: { tenantId: t } }),
    db.shipment.findMany({ where: { tenantId: t, status: { in: ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } }, select: { codAmount: true, bookedAt: true } }),
    db.product.count({ where: { tenantId: t, stock: { lte: db.product.fields.lowStockAt } } }),
  ]);
  const shipments30 = await db.shipment.groupBy({ by: ["courier", "status"], where: { tenantId: t, bookedAt: { gte: since } }, _count: true });

  const today = pkDay(new Date());
  const yesterday = pkDay(daysAgo(1));
  const live = orders.filter((o) => o.status !== "CANCELLED");
  const todayOrders = live.filter((o) => pkDay(o.placedAt) === today);
  const yOrders = live.filter((o) => pkDay(o.placedAt) === yesterday);
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const returned = orders.filter((o) => o.status === "RETURNED").length;
  const closed = delivered + returned;
  const newCount = toProcess.find((g) => g.status === "NEW")?._count ?? 0;
  const confirmedCount = toProcess.find((g) => g.status === "CONFIRMED")?._count ?? 0;
  const stuck = inTransit.filter((s) => msSince(s.bookedAt) > 5 * DAY).length;

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    return { key: pkDay(d), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" }), orders: 0, sales: 0 };
  });
  const byDay = new Map(days.map((d) => [d.key, d]));
  for (const o of live) {
    const d = byDay.get(pkDay(o.placedAt));
    if (d) { d.orders++; d.sales += o.total; }
  }

  const courierRows = [...new Set(shipments30.map((s) => s.courier))].map((c) => {
    const rows = shipments30.filter((s) => s.courier === c);
    const n = (st: string) => rows.filter((r) => r.status === st).reduce((a, r) => a + r._count, 0);
    const total = rows.reduce((a, r) => a + r._count, 0);
    const done = n("DELIVERED") + n("RETURNED");
    return { c, total, transit: n("BOOKED") + n("IN_TRANSIT") + n("OUT_FOR_DELIVERY"), delivered: n("DELIVERED"), returned: n("RETURNED"), rate: done ? (n("DELIVERED") / done) * 100 : null };
  });

  const cities = new Map<string, number>();
  for (const o of live) if (o.city) cities.set(o.city, (cities.get(o.city) ?? 0) + 1);
  const topCities = [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const setup = [
    { done: Boolean(shopify), label: "Connect your Shopify store", href: "/app/integrations" },
    { done: couriers > 0 || user.tenant.isDemo, label: "Connect a courier (PostEx, Leopards or TCS)", href: "/app/integrations" },
    { done: orders.some((o) => o.status !== "NEW" && o.status !== "CONFIRMED" && o.status !== "CANCELLED"), label: "Book your first parcel", href: "/app/orders?status=CONFIRMED" },
  ];
  const change = yOrders.length ? Math.round(((todayOrders.length - yOrders.length) / yOrders.length) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Last 30 days at a glance."
        actions={<LinkButton href="/app/orders?status=CONFIRMED">Book parcels</LinkButton>}
      />

      {setup.some((s) => !s.done) && (
        <Card>
          <CardHeader title="Get started" />
          <ul className="p-4 space-y-2">
            {setup.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                {s.done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-300" />}
                {s.done ? <span className="text-gray-500 line-through">{s.label}</span> : <Link href={s.href} className="text-gray-900 hover:underline">{s.label}</Link>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Orders today" value={todayOrders.length} hint={change === null ? `${yOrders.length} yesterday` : `${change >= 0 ? "+" : ""}${change}% vs yesterday`} tone={change === null ? undefined : change >= 0 ? "good" : "bad"} />
        <Stat label="Sales (30 days)" value={money(live.reduce((s, o) => s + o.total, 0))} hint={`${live.length} orders`} />
        <Stat label="Delivery rate" value={closed ? `${((delivered / closed) * 100).toFixed(1)}%` : "—"} hint={closed ? `${((returned / closed) * 100).toFixed(1)}% returned` : "No completed parcels yet"} tone={closed && returned / closed > 0.15 ? "bad" : "good"} />
        <Stat label="COD in transit" value={money(inTransit.reduce((s, x) => s + x.codAmount, 0))} hint={`${inTransit.length} parcels with couriers`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Orders per day" />
          <div className="p-4"><OrdersChart data={days} /></div>
        </Card>
        <Card>
          <CardHeader title="Needs attention" />
          <ul className="divide-y divide-gray-100 text-sm">
            {[
              { n: newCount, label: "new orders to confirm", href: "/app/orders?status=NEW" },
              { n: confirmedCount, label: "confirmed orders to book", href: "/app/orders?status=CONFIRMED" },
              { n: stuck, label: "parcels in transit for 5+ days", href: "/app/shipments?filter=stuck" },
              { n: lowStock, label: "products low on stock", href: "/app/inventory?filter=low" },
            ].map((x) => (
              <li key={x.label}>
                <Link href={x.href} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <span className="text-gray-700">{x.label}</span>
                  <span className={`font-semibold tabular-nums ${x.n ? "text-gray-900" : "text-gray-300"}`}>{x.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Courier performance (30 days)" action={<Link href="/app/shipments" className="text-sm text-gray-500 hover:text-gray-900">Shipments →</Link>} />
          {courierRows.length ? (
            <Table>
              <thead><tr><Th>Courier</Th><Th right>Booked</Th><Th right>In transit</Th><Th right>Delivered</Th><Th right>Returned</Th><Th right>Delivery rate</Th></tr></thead>
              <tbody>
                {courierRows.map((r) => (
                  <tr key={r.c}>
                    <Td className="font-medium">{courierName(r.c)}</Td>
                    <Td right>{r.total}</Td>
                    <Td right>{r.transit}</Td>
                    <Td right>{r.delivered}</Td>
                    <Td right>{r.returned}</Td>
                    <Td right className={r.rate !== null && r.rate < 85 ? "text-red-600" : ""}>{r.rate === null ? "—" : `${r.rate.toFixed(1)}%`}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-gray-500">No parcels booked in the last 30 days.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Top cities" />
          <ul className="p-4 space-y-2 text-sm">
            {topCities.length ? topCities.map(([c, n]) => (
              <li key={c} className="flex justify-between"><span className="text-gray-700">{c}</span><span className="tabular-nums text-gray-900">{n}</span></li>
            )) : <li className="text-gray-500">No orders yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
