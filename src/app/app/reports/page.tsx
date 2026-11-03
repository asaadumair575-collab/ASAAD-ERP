import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, daysAgo } from "@/lib/format";

const RANGES = { "30": "Last 30 days", "90": "Last 90 days", "365": "Last 12 months" } as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await requireUser();
  const days = (await searchParams).days;
  const range = days && days in RANGES ? (days as keyof typeof RANGES) : "30";
  const since = daysAgo(Number(range));

  const orders = await db.order.findMany({
    where: { tenantId: user.tenantId, placedAt: { gte: since } },
    select: { city: true, status: true, total: true, placedAt: true, items: { select: { title: true, qty: true, price: true, product: { select: { cost: true } } } } },
  });

  const city = new Map<string, { orders: number; delivered: number; returned: number; sales: number }>();
  const product = new Map<string, { qty: number; sales: number; cost: number; returned: number }>();
  const month = new Map<string, { orders: number; sales: number; delivered: number; returned: number }>();
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    const c = city.get(o.city ?? "Unknown") ?? { orders: 0, delivered: 0, returned: 0, sales: 0 };
    c.orders++;
    if (o.status === "DELIVERED") { c.delivered++; c.sales += o.total; }
    if (o.status === "RETURNED") c.returned++;
    city.set(o.city ?? "Unknown", c);

    const key = o.placedAt.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Asia/Karachi" });
    const m = month.get(key) ?? { orders: 0, sales: 0, delivered: 0, returned: 0 };
    m.orders++;
    m.sales += o.total;
    if (o.status === "DELIVERED") m.delivered++;
    if (o.status === "RETURNED") m.returned++;
    month.set(key, m);

    for (const i of o.items) {
      const p = product.get(i.title) ?? { qty: 0, sales: 0, cost: 0, returned: 0 };
      p.qty += i.qty;
      p.sales += i.qty * i.price;
      p.cost += i.qty * (i.product?.cost ?? 0);
      if (o.status === "RETURNED") p.returned += i.qty;
      product.set(i.title, p);
    }
  }
  const rate = (d: number, r: number) => (d + r ? `${((d / (d + r)) * 100).toFixed(1)}%` : "—");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        actions={
          <div className="flex gap-1">
            {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((k) => (
              <a key={k} href={`/app/reports?days=${k}`} className={`h-8 px-3 inline-flex items-center rounded-xl text-xs font-medium ${range === k ? "bg-gray-950 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>{RANGES[k]}</a>
            ))}
          </div>
        }
      />
      <Card>
        <CardHeader title="By month" />
        <Table>
          <thead><tr><Th>Month</Th><Th right>Orders</Th><Th right>Order value</Th><Th right>Delivered</Th><Th right>Returned</Th><Th right>Delivery rate</Th></tr></thead>
          <tbody>{[...month.entries()].map(([k, m]) => (
            <tr key={k}><Td className="font-medium">{k}</Td><Td right>{m.orders}</Td><Td right>{money(m.sales)}</Td><Td right>{m.delivered}</Td><Td right>{m.returned}</Td><Td right>{rate(m.delivered, m.returned)}</Td></tr>
          ))}</tbody>
        </Table>
      </Card>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Cities — where parcels get delivered vs returned" />
          <Table>
            <thead><tr><Th>City</Th><Th right>Orders</Th><Th right>Delivered sales</Th><Th right>Delivery rate</Th></tr></thead>
            <tbody>{[...city.entries()].sort((a, b) => b[1].orders - a[1].orders).slice(0, 25).map(([k, c]) => {
              const bad = c.delivered + c.returned >= 5 && c.returned / (c.delivered + c.returned) > 0.2;
              return <tr key={k}><Td>{k}</Td><Td right>{c.orders}</Td><Td right>{money(c.sales)}</Td><Td right className={bad ? "text-red-600 font-medium" : ""}>{rate(c.delivered, c.returned)}</Td></tr>;
            })}</tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Products" />
          <Table>
            <thead><tr><Th>Product</Th><Th right>Units</Th><Th right>Sales</Th><Th right>Margin</Th><Th right>Returned</Th></tr></thead>
            <tbody>{[...product.entries()].sort((a, b) => b[1].sales - a[1].sales).slice(0, 25).map(([k, p]) => (
              <tr key={k}><Td>{k}</Td><Td right>{p.qty}</Td><Td right>{money(p.sales)}</Td><Td right>{p.cost ? `${(((p.sales - p.cost) / p.sales) * 100).toFixed(0)}%` : "—"}</Td><Td right className={p.returned ? "text-red-600" : "text-gray-400"}>{p.returned}</Td></tr>
            ))}</tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
