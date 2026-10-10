"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDemo, useInvoiceRows } from "@/lib/demo/store";
import { Card, CardTitle, PageHeader, Td, Th, compact, money } from "../_components/ui";

export default function ReportsPage() {
  const rows = useInvoiceRows();
  const products = useDemo((s) => s.products);

  const r = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; sales: number; collected: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-GB", { month: "short" }), sales: 0, collected: 0 });
    }
    const prod = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    const cost = new Map(products.map((p) => [p.id, p.cost]));
    const cust = new Map<number, { name: string; company: string; invoices: number; revenue: number }>();
    const city = new Map<string, number>();
    for (const inv of rows) {
      const m = months.find((x) => x.key === inv.date.slice(0, 7));
      if (m) {
        m.sales += inv.total;
        m.collected += inv.paid;
      }
      for (const it of inv.items) {
        const p = prod.get(it.name) ?? { name: it.name, qty: 0, revenue: 0, profit: 0 };
        p.qty += it.qty;
        p.revenue += it.qty * it.rate;
        p.profit += it.qty * (it.rate - (it.productId ? cost.get(it.productId) ?? 0 : it.rate * 0.65));
        prod.set(it.name, p);
      }
      if (inv.customer) {
        const c = cust.get(inv.customerId) ?? { name: inv.customer.name, company: inv.customer.company, invoices: 0, revenue: 0 };
        c.invoices++;
        c.revenue += inv.total;
        cust.set(inv.customerId, c);
        city.set(inv.customer.city, (city.get(inv.customer.city) ?? 0) + inv.total);
      }
    }
    return {
      months,
      products: [...prod.values()].sort((a, b) => b.revenue - a.revenue),
      customers: [...cust.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      cities: [...city.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [rows, products]);

  const maxCity = Math.max(...r.cities.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Sales performance over the last 12 months." />

      <Card>
        <CardTitle>Sales vs Collections</CardTitle>
        <div className="h-[280px] px-3 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={r.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F15A24" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#F15A24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => compact(v)} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#F15A24" strokeWidth={2.5} fill="url(#sales)" />
              <Area type="monotone" dataKey="collected" name="Collected" stroke="#12B76A" strokeWidth={2.5} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardTitle>Product Performance</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFBFC] border-y border-gray-100">
                <tr><Th>Product</Th><Th right>Units sold</Th><Th right>Revenue</Th><Th right>Profit</Th><Th right>Margin</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {r.products.map((p) => (
                  <tr key={p.name}>
                    <Td className="font-medium">{p.name}</Td>
                    <Td right>{p.qty.toLocaleString()}</Td>
                    <Td right>{money(p.revenue)}</Td>
                    <Td right className="text-emerald-600 font-semibold">{money(p.profit)}</Td>
                    <Td right>{p.revenue ? ((p.profit / p.revenue) * 100).toFixed(1) : "0"}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardTitle>Sales by City</CardTitle>
          <div className="px-5 pb-5 space-y-3">
            {r.cities.map(([c, v]) => (
              <div key={c}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{c}</span><span className="font-semibold tabular-nums">{money(v)}</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#F15A24] rounded-full" style={{ width: `${(v / maxCity) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardTitle>Top 10 Customers</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-y border-gray-100">
              <tr><Th>#</Th><Th>Customer</Th><Th right>Invoices</Th><Th right>Revenue</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {r.customers.map((c, i) => (
                <tr key={c.name}>
                  <Td className="text-gray-400">{i + 1}</Td>
                  <Td>{c.name}<div className="text-xs text-gray-400">{c.company}</div></Td>
                  <Td right>{c.invoices}</Td>
                  <Td right className="font-semibold">{money(c.revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
