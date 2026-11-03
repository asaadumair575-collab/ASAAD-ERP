import { ArrowRight, CheckCircle2, Circle, PackageCheck, RefreshCw, ShoppingCart, TrendingUp, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import OrdersChart from "@/components/OrdersChart";
import StatusDonut from "@/components/StatusDonut";
import { Badge, Card, CardHeader, LinkButton, PageHeader, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { ORDER_STATUS, money, daysAgo, msSince, timeAgo } from "@/lib/format";
import { profitSummary } from "@/lib/profit";

const DAY = 86400000;
const pkDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

const DONUT = [
  { key: "NEW", label: "New", color: "#0ea5e9" },
  { key: "CONFIRMED", label: "Confirmed", color: "#8b5cf6" },
  { key: "SHIPPED", label: "With courier", color: "#f59e0b" },
  { key: "DELIVERED", label: "Delivered", color: "#10b981" },
  { key: "RETURNED", label: "Returned", color: "#ef4444" },
  { key: "CANCELLED", label: "Cancelled", color: "#9ca3af" },
] as const;

export default async function Dashboard() {
  const user = await requireUser();
  const t = user.tenantId;
  const since = daysAgo(30);

  const [orders, toProcess, shopify, couriers, inTransit, lowStock, latest, shipments30, profit, topItems] = await Promise.all([
    db.order.findMany({ where: { tenantId: t, placedAt: { gte: since } }, select: { placedAt: true, total: true, status: true, city: true } }),
    db.order.groupBy({ by: ["status"], where: { tenantId: t, status: { in: ["NEW", "CONFIRMED"] } }, _count: true }),
    db.shopifyConnection.findUnique({ where: { tenantId: t }, select: { shopDomain: true } }),
    db.courierAccount.count({ where: { tenantId: t } }),
    db.shipment.findMany({ where: { tenantId: t, status: { in: ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } }, select: { codAmount: true, bookedAt: true } }),
    db.product.count({ where: { tenantId: t, stock: { lte: db.product.fields.lowStockAt } } }),
    db.order.findMany({ where: { tenantId: t }, orderBy: { placedAt: "desc" }, take: 6, select: { id: true, number: true, customerName: true, city: true, total: true, status: true, placedAt: true } }),
    db.shipment.groupBy({ by: ["courier", "status"], where: { tenantId: t, bookedAt: { gte: since } }, _count: true }),
    profitSummary(t, since),
    db.orderItem.groupBy({ by: ["title"], where: { order: { tenantId: t, placedAt: { gte: since }, status: { not: "CANCELLED" } } }, _sum: { qty: true }, orderBy: { _sum: { qty: "desc" } }, take: 5 }),
  ]);

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

  const donutCount = (k: string) =>
    orders.filter((o) => (k === "SHIPPED" ? o.status === "BOOKED" || o.status === "IN_TRANSIT" : o.status === k)).length;
  const donut = DONUT.map((d) => ({ name: d.label, value: donutCount(d.key), color: d.color }));

  const courierRows = [...new Set(shipments30.map((s) => s.courier))].map((c) => {
    const rows = shipments30.filter((s) => s.courier === c);
    const n = (st: string) => rows.filter((r) => r.status === st).reduce((a, r) => a + r._count, 0);
    const total = rows.reduce((a, r) => a + r._count, 0);
    const done = n("DELIVERED") + n("RETURNED");
    return { c, total, transit: n("BOOKED") + n("IN_TRANSIT") + n("OUT_FOR_DELIVERY"), rate: done ? (n("DELIVERED") / done) * 100 : null };
  });

  const cities = new Map<string, number>();
  for (const o of live) if (o.city) cities.set(o.city, (cities.get(o.city) ?? 0) + 1);
  const topCities = [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCity = topCities[0]?.[1] ?? 1;

  const setup = [
    { done: Boolean(shopify) || user.tenant.isDemo, label: "Connect your Shopify store", href: "/app/integrations" },
    { done: couriers > 0 || user.tenant.isDemo, label: "Connect a courier (PostEx, Leopards or TCS)", href: "/app/integrations" },
    { done: orders.some((o) => !["NEW", "CONFIRMED", "CANCELLED"].includes(o.status)), label: "Book your first parcel", href: "/app/orders?status=CONFIRMED" },
  ];
  const change = yOrders.length ? Math.round(((todayOrders.length - yOrders.length) / yOrders.length) * 100) : null;
  const sales30 = live.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Here's how your store is doing — last 30 days."
        actions={
          <>
            <LinkButton href="/app/shipments" variant="secondary"><RefreshCw className="w-4 h-4" />Track parcels</LinkButton>
            <LinkButton href="/app/orders?status=CONFIRMED"><Truck className="w-4 h-4" />Book parcels</LinkButton>
          </>
        }
      />

      {setup.some((s) => !s.done) && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-[15px] font-semibold text-gray-950">Finish setting up — {setup.filter((s) => s.done).length} of {setup.length} done</h2>
            <Link href="/app/help" className="text-sm text-gray-500 hover:text-gray-950">Step-by-step guides →</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {setup.map((s) => (
              <Link key={s.label} href={s.href} className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${s.done ? "border-gray-100 text-gray-400" : "border-gray-200 text-gray-900 hover:border-gray-950"}`}>
                {s.done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
                <span className={s.done ? "line-through" : "font-medium"}>{s.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={ShoppingCart} chip="blue" label="Orders today" value={todayOrders.length}
          hint={change === null ? `${yOrders.length} yesterday` : `${change >= 0 ? "+" : ""}${change}% vs yesterday`} tone={change === null ? undefined : change >= 0 ? "good" : "bad"} />
        <Stat icon={PackageCheck} chip="green" label="Delivery rate (30d)" value={closed ? `${((delivered / closed) * 100).toFixed(1)}%` : "—"}
          hint={closed ? `${((returned / closed) * 100).toFixed(1)}% returned` : undefined} tone={closed && returned / closed > 0.15 ? "bad" : "warn"} />
        <Stat icon={Wallet} chip="amber" label="COD with couriers" value={money(inTransit.reduce((s, x) => s + x.codAmount, 0))} hint={`${inTransit.length} parcels`} />
        <Stat icon={TrendingUp} label="Net profit (30d)" value={money(profit.net)} hint={profit.revenue ? `${((profit.net / profit.revenue) * 100).toFixed(0)}% margin` : undefined} tone={profit.net >= 0 ? "good" : "bad"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title={<>Sales & orders <span className="block text-xs font-normal text-gray-500 mt-0.5">{live.length} orders · {money(sales30)} in 30 days</span></>}
            action={<span className="flex items-center gap-3 text-xs text-gray-500"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-950" />Sales</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-emerald-500" />Orders</span></span>}
          />
          <div className="px-3 pb-4"><OrdersChart data={days} /></div>
        </Card>
        <Card>
          <CardHeader title={<>Order status <span className="text-xs font-normal text-gray-400">30 days</span></>} />
          <div className="px-5 pb-5">
            <StatusDonut data={donut} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-5 text-sm">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-gray-600 flex-1 truncate">{d.name}</span>
                  <span className="font-semibold tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Latest orders" action={<Link href="/app/orders" className="text-sm text-gray-500 hover:text-gray-950 inline-flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>} />
          <ul className="divide-y divide-gray-100">
            {latest.map((o) => (
              <li key={o.id}>
                <Link href={`/app/orders/${o.id}`} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[5rem_1fr_7rem_6rem_6rem] items-center gap-3 px-5 py-3 hover:bg-gray-50/70 text-sm">
                  <span className="font-semibold text-gray-950">{o.number}</span>
                  <span className="min-w-0"><span className="block truncate text-gray-900">{o.customerName}</span><span className="sm:hidden text-xs text-gray-500">{o.city}</span></span>
                  <span className="hidden sm:block text-gray-500 truncate">{o.city ?? "—"}</span>
                  <span className="text-right tabular-nums font-medium">{money(o.total)}</span>
                  <span className="hidden sm:flex justify-end"><Badge className={ORDER_STATUS[o.status].cls}>{ORDER_STATUS[o.status].label}</Badge></span>
                </Link>
              </li>
            ))}
            {!latest.length && <li className="px-5 py-8 text-sm text-gray-500 text-center">No orders yet — they arrive automatically once Shopify is connected.</li>}
          </ul>
          {latest[0] && <p className="px-5 py-3 text-xs text-gray-400">Last order {timeAgo(latest[0].placedAt)}</p>}
        </Card>
        <Card>
          <CardHeader title="Needs your attention" />
          <ul className="px-3 pb-3 space-y-1">
            {[
              { n: newCount, label: "New orders to confirm", href: "/app/orders?status=NEW", dot: "bg-sky-500" },
              { n: confirmedCount, label: "Confirmed, ready to book", href: "/app/orders?status=CONFIRMED", dot: "bg-violet-500" },
              { n: stuck, label: "Parcels stuck 5+ days", href: "/app/shipments?filter=stuck", dot: "bg-red-500" },
              { n: lowStock, label: "Products low on stock", href: "/app/inventory?filter=low", dot: "bg-amber-500" },
            ].map((x) => (
              <li key={x.label}>
                <Link href={x.href} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50">
                  <span className={`w-2 h-2 rounded-full ${x.n ? x.dot : "bg-gray-200"}`} />
                  <span className="flex-1 text-sm text-gray-700">{x.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${x.n ? "text-gray-950" : "text-gray-300"}`}>{x.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Courier performance" action={<Link href="/app/reports" className="text-sm text-gray-500 hover:text-gray-950">Details</Link>} />
          <div className="px-5 pb-5 space-y-4">
            {courierRows.length ? courierRows.map((r) => (
              <div key={r.c}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-900">{courierName(r.c)}</span>
                  <span className="text-gray-500 text-xs">{r.total} booked · {r.transit} in transit</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.rate ?? 0}%` }} /></div>
                  <span className="text-xs font-semibold tabular-nums w-10 text-right">{r.rate === null ? "—" : `${r.rate.toFixed(0)}%`}</span>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">No parcels booked in the last 30 days.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Top cities" />
          <div className="px-5 pb-5 space-y-3">
            {topCities.length ? topCities.map(([c, n]) => (
              <div key={c}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-700">{c}</span><span className="font-semibold tabular-nums">{n}</span></div>
                <div className="h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full bg-gray-950" style={{ width: `${(n / maxCity) * 100}%` }} /></div>
              </div>
            )) : <p className="text-sm text-gray-500">No orders yet.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Best sellers" action={<Link href="/app/inventory" className="text-sm text-gray-500 hover:text-gray-950">Inventory</Link>} />
          <ol className="px-5 pb-5 space-y-3">
            {topItems.length ? topItems.map((p, i) => (
              <li key={p.title} className="flex items-center gap-3 text-sm">
                <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 truncate text-gray-800">{p.title}</span>
                <span className="font-semibold tabular-nums">{p._sum.qty ?? 0} sold</span>
              </li>
            )) : <li className="text-sm text-gray-500">No sales yet.</li>}
          </ol>
        </Card>
      </div>
    </div>
  );
}
