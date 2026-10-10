"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDemo, useInvoiceRows } from "@/lib/demo/store";
import { Button, Card, CardTitle, Kpi, StatusBadge, Td, Th, compact, fmtDate, money } from "./_components/ui";

const RANGES = { "12M": 12, "6M": 6, "3M": 3 } as const;

export default function DemoDashboard() {
  const rows = useInvoiceRows();
  const customers = useDemo((s) => s.customers);
  const payments = useDemo((s) => s.payments);
  const [range, setRange] = useState<keyof typeof RANGES>("12M");

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevSameDay = new Date(prevStart);
    prevSameDay.setDate(now.getDate());
    const prevStartISO = prevStart.toISOString().slice(0, 10);
    const prevSameISO = prevSameDay.toISOString().slice(0, 10);
    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

    const cur = rows.filter((r) => r.date >= monthStart);
    const prev = rows.filter((r) => r.date >= prevStartISO && r.date <= prevSameISO);
    const curSales = cur.reduce((s, r) => s + r.total, 0);
    const prevSales = prev.reduce((s, r) => s + r.total, 0);
    const outstanding = rows.reduce((s, r) => s + r.balance, 0);
    const overdue = rows.filter((r) => r.status === "Overdue").length;
    const received = payments.filter((p) => p.date >= monthStart).reduce((s, p) => s + p.amount, 0);
    const newCustomers = customers.filter((c) => c.createdAt >= monthStart).length;

    const months: { key: string; label: string; sales: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-GB", { month: "short" }), sales: 0 });
    }
    for (const r of rows) {
      const m = months.find((x) => x.key === r.date.slice(0, 7));
      if (m) m.sales += r.total;
    }

    const status = { Paid: 0, Partial: 0, Unpaid: 0, Overdue: 0 };
    for (const r of rows) status[r.status]++;

    return {
      curSales, salesChange: pct(curSales, prevSales), ordersMonth: cur.length, ordersChange: pct(cur.length, prev.length),
      outstanding, overdue, received, newCustomers, months, status,
    };
  }, [rows, customers, payments]);

  const attention = rows.filter((r) => r.status === "Overdue" || r.status === "Partial").sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).slice(0, 6);
  const recent = rows.slice(0, 5);
  const chartData = stats.months.slice(-RANGES[range]);
  const pieData = [
    { name: "Paid", value: stats.status.Paid, color: "#12B76A" },
    { name: "Partial", value: stats.status.Partial, color: "#F79009" },
    { name: "Unpaid", value: stats.status.Unpaid, color: "#98A2B3" },
    { name: "Overdue", value: stats.status.Overdue, color: "#F04438" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here&apos;s how your business is doing this month.</p>
        </div>
        <Button href="/demo/invoices/new">+ New Invoice</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi tone="green" icon={<path d="M3 14l4.5-4.5 3 3L17 6M12 6h5v5" />} label="Sales this month" value={money(stats.curSales)} change={stats.salesChange} />
        <Kpi tone="blue" icon={<path d="M5 2h7l4 4v12H5zM12 2v4h4M8 10h5M8 13h5" />} label="Invoices this month" value={stats.ordersMonth} change={stats.ordersChange} />
        <Kpi tone="orange" icon={<path d="M10 3l8 14H2L10 3zM10 8v4M10 14.5h.01" />} label="Outstanding balance" value={money(stats.outstanding)} note={`${stats.overdue} overdue`} />
        <Kpi tone="violet" icon={<path d="M2 5h16v10H2zM2 8h16M5 12h3" />} label="Received this month" value={money(stats.received)} note={stats.newCustomers ? `+${stats.newCustomers} new customers` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle
            right={
              <div className="flex gap-1">
                {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRange(k)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${range === k ? "bg-[#F15A24] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            }
          >
            Monthly Revenue
          </CardTitle>
          <div className="h-[280px] px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => compact(v)} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} cursor={{ fill: "#FFF1EA" }} />
                <Bar dataKey="sales" name="Sales" fill="#F15A24" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Invoice Status</CardTitle>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 px-5 pb-5">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-gray-600">{d.name}</span>
                <span className="ml-auto font-semibold tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardTitle
          right={
            <Link href="/demo/invoices?status=Overdue" className="text-sm font-medium text-[#F15A24] hover:text-[#D9480F]">
              View All
            </Link>
          }
        >
          <span className="flex items-center gap-2">
            Needs Attention
            <span className="text-xs font-medium text-[#D9480F] bg-[#FFF1EA] px-2 py-0.5 rounded-full">{attention.length} items</span>
          </span>
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-y border-gray-100">
              <tr>
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th>Due Date</Th>
                <Th right>Total</Th>
                <Th right>Balance</Th>
                <Th>Status</Th>
                <Th right>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attention.map((r) => (
                <tr key={r.id} className={r.status === "Overdue" ? "bg-red-50/30" : ""}>
                  <Td className="font-medium">{r.number}</Td>
                  <Td>{r.customer?.name}</Td>
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDate(r.dueDate)}</Td>
                  <Td right>{money(r.total)}</Td>
                  <Td right className={`font-semibold ${r.status === "Overdue" ? "text-red-600" : "text-[#D9480F]"}`}>{money(r.balance)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td right>
                    <Link href={`/demo/invoices/${r.id}`} className="inline-block bg-[#F15A24] hover:bg-[#D9480F] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg">
                      Collect
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardTitle right={<Link href="/demo/invoices" className="text-sm font-medium text-[#F15A24] hover:text-[#D9480F]">All invoices</Link>}>
          Recent Invoices
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50 border-t border-gray-100">
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <Td className="font-medium"><Link href={`/demo/invoices/${r.id}`} className="hover:text-[#F15A24]">{r.number}</Link></Td>
                  <Td>{r.customer?.name}<div className="text-xs text-gray-400">{r.customer?.company}</div></Td>
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</Td>
                  <Td right className="font-semibold">{money(r.total)}</Td>
                  <Td right><StatusBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
