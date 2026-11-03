"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COURIERS, ORDER_STATUSES } from "@/lib/demo/data";
import { useDemo, useOrderRows } from "@/lib/demo/store";
import { Button, Card, CardTitle, CourierBadge, Kpi, ShopifyBadge, StatusBadge, Td, Th, compact, money, timeAgo } from "./_components/ui";

const RANGES = { "30D": 30, "14D": 14, "7D": 7 } as const;
const STATUS_COLOR: Record<string, string> = {
  New: "#0BA5EC", Confirmed: "#7A5AF8", Shipped: "#F79009", Delivered: "#12B76A", Returned: "#F04438", Cancelled: "#98A2B3",
};

export default function Dashboard() {
  const rows = useOrderRows();
  const syncShopify = useDemo((s) => s.syncShopify);
  const toast = useDemo((s) => s.toast);
  const [range, setRange] = useState<keyof typeof RANGES>("30D");
  const [syncing, setSyncing] = useState(false);

  const s = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yStart = new Date(todayStart.getTime() - 86400000);
    const ySame = new Date(now.getTime() - 86400000);
    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);
    const inRange = (from: Date, to: Date) => rows.filter((r) => r.createdAt >= from.toISOString() && r.createdAt <= to.toISOString());
    const today = inRange(todayStart, now);
    const yesterday = inRange(yStart, ySame);
    const live = (rs: typeof rows) => rs.filter((r) => r.status !== "Cancelled");
    const sales = (rs: typeof rows) => live(rs).reduce((a, r) => a + r.total, 0);

    const last30 = rows.filter((r) => r.createdAt >= new Date(now.getTime() - 30 * 86400000).toISOString());
    const closed = last30.filter((r) => r.status === "Delivered" || r.status === "Returned");
    const delivered = closed.filter((r) => r.status === "Delivered").length;
    const returned = closed.length - delivered;
    const codPending = rows.filter((r) => r.payment === "COD" && (r.status === "Shipped" || (r.status === "Delivered" && !r.remitted))).reduce((a, r) => a + r.total, 0);

    const days: { key: string; label: string; orders: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 86400000);
      days.push({ key: d.toDateString(), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), orders: 0, revenue: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.key, d]));
    for (const r of live(last30)) {
      const d = dayMap.get(new Date(r.createdAt).toDateString());
      if (d) {
        d.orders++;
        d.revenue += r.total;
      }
    }

    const status = ORDER_STATUSES.map((st) => ({ name: st, value: last30.filter((r) => r.status === st).length })).filter((x) => x.value);

    const courier = COURIERS.map((c) => {
      const mine = last30.filter((r) => r.courier === c);
      const done = mine.filter((r) => r.status === "Delivered" || r.status === "Returned");
      const del = done.filter((r) => r.status === "Delivered").length;
      return { c, booked: mine.length, inTransit: mine.filter((r) => r.status === "Shipped").length, rate: done.length ? (del / done.length) * 100 : 0 };
    });

    const prod = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const r of live(last30)) for (const i of r.items) {
      const p = prod.get(i.name) ?? { name: i.name, qty: 0, revenue: 0 };
      p.qty += i.qty;
      p.revenue += i.qty * i.price;
      prod.set(i.name, p);
    }

    return {
      todayCount: live(today).length, ordersChange: pct(live(today).length, live(yesterday).length),
      todaySales: sales(today), salesChange: pct(sales(today), sales(yesterday)),
      deliveryRate: closed.length ? (delivered / closed.length) * 100 : 0, returnRate: closed.length ? (returned / closed.length) * 100 : 0,
      toProcess: rows.filter((r) => r.status === "New" || r.status === "Confirmed").length,
      codPending, days, status, courier,
      topProducts: [...prod.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      revenue30: sales(last30), orders30: live(last30).length,
    };
  }, [rows]);

  const chartData = s.days.slice(-RANGES[range]);
  const recent = rows.slice(0, 7);

  function sync() {
    setSyncing(true);
    setTimeout(() => {
      const n = syncShopify();
      toast(n ? `${n} new order${n === 1 ? "" : "s"} synced from Shopify` : "Shopify is disconnected");
      setSyncing(false);
    }, 900);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live overview of your store — orders sync from Shopify automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={sync} disabled={syncing}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}><path d="M3 10a7 7 0 0 1 12-4.9L17 7M17 3v4h-4M17 10a7 7 0 0 1-12 4.9L3 13M3 17v-4h4" /></svg>
            {syncing ? "Syncing…" : "Sync Shopify"}
          </Button>
          <Button href="/demo/orders?status=Confirmed">Book Shipments</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi tone="blue" icon={<path d="M3 4h2l1.6 8.2a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L17.5 7H6M9 17h.01M15 17h.01" />} label="Orders today" value={s.todayCount} change={s.ordersChange} />
        <Kpi tone="green" icon={<path d="M3 14l4.5-4.5 3 3L17 6M12 6h5v5" />} label="Sales today" value={money(s.todaySales)} change={s.salesChange} />
        <Kpi tone="violet" icon={<path d="M4 10l4 4 8-8" />} label="Delivery rate (30d)" value={`${s.deliveryRate.toFixed(1)}%`} note={`${s.returnRate.toFixed(1)}% returned`} />
        <Kpi tone="orange" icon={<path d="M2 5h16v10H2zM2 8h16M5 12h3" />} label="COD with couriers" value={money(s.codPending)} note={`${s.toProcess} to process`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle
            right={
              <div className="flex gap-1">
                {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((k) => (
                  <button key={k} type="button" onClick={() => setRange(k)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${range === k ? "bg-[#F15A24] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                    {k}
                  </button>
                ))}
              </div>
            }
          >
            <span>Orders &amp; Revenue</span>
            <span className="block text-xs font-normal text-gray-400 mt-0.5">{s.orders30} orders · {money(s.revenue30)} in 30 days</span>
          </CardTitle>
          <div className="h-[280px] px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                <YAxis yAxisId="r" tickFormatter={(v) => compact(v)} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} width={48} />
                <YAxis yAxisId="o" orientation="right" tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip formatter={(v, n) => (n === "Revenue" ? money(Number(v)) : v)} cursor={{ fill: "#FFF1EA" }} />
                <Bar yAxisId="r" dataKey="revenue" name="Revenue" fill="#F15A24" radius={[5, 5, 0, 0]} />
                <Line yAxisId="o" dataKey="orders" name="Orders" stroke="#101828" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Order Status <span className="text-xs font-normal text-gray-400">30 days</span></CardTitle>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={s.status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2}>
                  {s.status.map((d) => <Cell key={d.name} fill={STATUS_COLOR[d.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 pb-5">
            {s.status.map((d) => (
              <Link key={d.name} href={`/demo/orders?status=${d.name}`} className="flex items-center gap-2 text-sm hover:text-[#F15A24]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[d.name] }} />
                <span className="text-gray-600">{d.name}</span>
                <span className="ml-auto font-semibold tabular-nums">{d.value}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardTitle right={<Link href="/demo/orders" className="text-sm font-medium text-[#F15A24] hover:text-[#D9480F]">View All</Link>}>
            <span className="flex items-center gap-2">
              Latest Orders
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </span>
          </CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFBFC] border-y border-gray-100">
                <tr><Th>Order</Th><Th>Customer</Th><Th>City</Th><Th right>Total</Th><Th>Status</Th><Th right>Time</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <Td><Link href={`/demo/orders/${r.id}`} className="font-semibold hover:text-[#F15A24]">{r.number}</Link><div className="mt-0.5"><ShopifyBadge /></div></Td>
                    <Td>{r.customer?.name}</Td>
                    <Td className="text-gray-500">{r.customer?.city}</Td>
                    <Td right className="font-semibold">{money(r.total)}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td right className="text-gray-400 whitespace-nowrap">{timeAgo(r.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle right={<Link href="/demo/shipments" className="text-sm font-medium text-[#F15A24]">Details</Link>}>Courier Performance</CardTitle>
            <div className="px-5 pb-5 space-y-4">
              {s.courier.map((c) => (
                <div key={c.c}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <CourierBadge courier={c.c} />
                    <span className="text-gray-500 text-xs">{c.booked} booked · {c.inTransit} in transit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.rate}%` }} /></div>
                    <span className="text-xs font-semibold tabular-nums w-12 text-right">{c.rate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">Delivered vs returned, last 30 days</p>
            </div>
          </Card>
          <Card>
            <CardTitle>Top Products</CardTitle>
            <div className="px-5 pb-5 space-y-3">
              {s.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-gray-400">{i + 1}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-gray-400 text-xs">{p.qty} sold</span>
                  <span className="font-semibold tabular-nums">{money(p.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
