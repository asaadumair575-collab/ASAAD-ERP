"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COURIERS } from "@/lib/demo/data";
import { useDemo, useOrderRows } from "@/lib/demo/store";
import { Card, CardTitle, CourierBadge, Kpi, PageHeader, Td, Th, compact, money, isoDaysAgo } from "../_components/ui";

// Ad spend is a fixed daily figure in the demo, just so the profit line
// reflects what a real store pays to get orders.
const AD_SPEND_PER_DAY = 9000;

export default function FinancePage() {
  const rows = useOrderRows();
  const products = useDemo((s) => s.products);

  const f = useMemo(() => {
    const cost = new Map(products.map((p) => [p.id, p.cost]));
    const since = isoDaysAgo(30);
    const last30 = rows.filter((r) => r.createdAt >= since);
    const delivered = last30.filter((r) => r.status === "Delivered");
    const returned = last30.filter((r) => r.status === "Returned");
    const revenue = delivered.reduce((s, r) => s + r.total, 0);
    const cogs = delivered.reduce((s, r) => s + r.items.reduce((a, i) => a + i.qty * (cost.get(i.productId) ?? 0), 0), 0);
    const courierCharges = last30.filter((r) => r.courier).reduce((s, r) => s + r.courierCharge, 0);
    const ads = AD_SPEND_PER_DAY * 30;
    const profit = revenue - cogs - courierCharges - ads;

    const remit = COURIERS.map((c) => {
      const mine = rows.filter((r) => r.courier === c && r.payment === "COD");
      return {
        c,
        received: mine.filter((r) => r.remitted).reduce((s, r) => s + r.total, 0),
        pending: mine.filter((r) => r.status === "Delivered" && !r.remitted).reduce((s, r) => s + r.total, 0),
        transit: mine.filter((r) => r.status === "Shipped").reduce((s, r) => s + r.total, 0),
      };
    });

    const weeks: { label: string; revenue: number; costs: number; profit: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const from = isoDaysAgo((w + 1) * 7);
      const to = isoDaysAgo(w * 7);
      const wk = rows.filter((r) => r.createdAt >= from && r.createdAt < to);
      const rev = wk.filter((r) => r.status === "Delivered").reduce((s, r) => s + r.total, 0);
      const c =
        wk.filter((r) => r.status === "Delivered").reduce((s, r) => s + r.items.reduce((a, i) => a + i.qty * (cost.get(i.productId) ?? 0), 0), 0) +
        wk.filter((r) => r.courier).reduce((s, r) => s + r.courierCharge, 0) +
        AD_SPEND_PER_DAY * 7;
      weeks.push({ label: w === 0 ? "This week" : `${w}w ago`, revenue: rev, costs: c, profit: rev - c });
    }

    return { revenue, cogs, courierCharges, ads, profit, returnedValue: returned.reduce((s, r) => s + r.total, 0), returnCount: returned.length, remit, weeks };
  }, [rows, products]);

  const margin = f.revenue ? (f.profit / f.revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="Real profit after product cost, courier charges, returns and ads — last 30 days." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi tone="green" icon={<path d="M3 14l4.5-4.5 3 3L17 6M12 6h5v5" />} label="Delivered revenue" value={money(f.revenue)} />
        <Kpi tone="blue" icon={<path d="M1 5h11v9H1zM12 8h4l3 3v3h-7" />} label="Courier charges" value={money(f.courierCharges)} />
        <Kpi tone="red" icon={<path d="M3 10a7 7 0 1 0 2-4.9M3 3v4h4" />} label="Returned orders" value={money(f.returnedValue)} note={`${f.returnCount} parcels`} />
        <Kpi tone="orange" icon={<path d="M10 2v16M14 5.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5S7.8 8 10 8.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" />} label="Net profit" value={money(f.profit)} note={`${margin.toFixed(1)}% margin`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle>Weekly Profit</CardTitle>
          <div className="h-[280px] px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={f.weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => compact(v)} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} width={52} />
                <Tooltip formatter={(v) => money(Number(v))} cursor={{ fill: "#FAFBFC" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#F15A24" radius={[6, 6, 0, 0]} />
                <Bar dataKey="costs" name="Costs" fill="#FFC9B0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#12B76A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Profit Breakdown</CardTitle>
          <div className="px-5 pb-5 space-y-2.5 text-sm">
            {[
              ["Delivered revenue", f.revenue, "text-gray-900"],
              ["Product cost", -f.cogs, "text-gray-500"],
              ["Courier charges", -f.courierCharges, "text-gray-500"],
              ["Ad spend", -f.ads, "text-gray-500"],
            ].map(([k, v, cls]) => (
              <div key={k as string} className="flex justify-between">
                <span className="text-gray-600">{k}</span>
                <span className={`tabular-nums ${cls}`}>{(v as number) < 0 ? `− ${money(-(v as number))}` : money(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-gray-100 font-bold text-base">
              <span>Net profit</span>
              <span className={f.profit >= 0 ? "text-emerald-600" : "text-red-600"}>{money(f.profit)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardTitle>COD Remittance by Courier</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-y border-gray-100">
              <tr><Th>Courier</Th><Th right>Received in bank</Th><Th right>Delivered, payment pending</Th><Th right>Still in transit</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {f.remit.map((r) => (
                <tr key={r.c}>
                  <Td><CourierBadge courier={r.c} /></Td>
                  <Td right className="text-emerald-600 font-semibold">{money(r.received)}</Td>
                  <Td right className="text-[#D9480F] font-semibold">{money(r.pending)}</Td>
                  <Td right className="text-gray-600">{money(r.transit)}</Td>
                </tr>
              ))}
              <tr className="bg-[#FAFBFC] font-semibold">
                <Td>Total</Td>
                <Td right>{money(f.remit.reduce((s, r) => s + r.received, 0))}</Td>
                <Td right>{money(f.remit.reduce((s, r) => s + r.pending, 0))}</Td>
                <Td right>{money(f.remit.reduce((s, r) => s + r.transit, 0))}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
