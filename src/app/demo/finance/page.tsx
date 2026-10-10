"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { todayISO, type ExpenseCategory } from "@/lib/demo/data";
import { useDemo, useInvoiceRows } from "@/lib/demo/store";
import { Button, Card, CardTitle, Field, Kpi, Modal, PageHeader, Td, Th, compact, fmtDate, inputCls, money } from "../_components/ui";

const CATEGORIES: ExpenseCategory[] = ["Rent", "Salaries", "Utilities", "Transport", "Marketing", "Office"];

export default function FinancePage() {
  const rows = useInvoiceRows();
  const products = useDemo((s) => s.products);
  const expenses = useDemo((s) => s.expenses);
  const addExpense = useDemo((s) => s.addExpense);
  const [adding, setAdding] = useState(false);

  // Profit & loss: revenue from invoices, cost of goods from product cost,
  // operating expenses from the expense book.
  const pl = useMemo(() => {
    const cost = new Map(products.map((p) => [p.id, p.cost]));
    const months: { key: string; label: string; revenue: number; cogs: number; expenses: number; profit: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-GB", { month: "short" }), revenue: 0, cogs: 0, expenses: 0, profit: 0 });
    }
    const at = (date: string) => months.find((m) => m.key === date.slice(0, 7));
    for (const r of rows) {
      const m = at(r.date);
      if (!m) continue;
      m.revenue += r.total;
      m.cogs += r.items.reduce((s, it) => s + it.qty * (it.productId ? cost.get(it.productId) ?? 0 : it.rate * 0.65), 0);
    }
    for (const e of expenses) {
      const m = at(e.date);
      if (m) m.expenses += e.amount;
    }
    for (const m of months) m.profit = m.revenue - m.cogs - m.expenses;
    return months;
  }, [rows, products, expenses]);

  const t = pl.reduce((a, m) => ({ revenue: a.revenue + m.revenue, cogs: a.cogs + m.cogs, expenses: a.expenses + m.expenses, profit: a.profit + m.profit }), { revenue: 0, cogs: 0, expenses: 0, profit: 0 });
  const margin = t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0;
  const recent = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
  const byCategory = CATEGORIES.map((c) => ({ c, amount: expenses.filter((e) => e.category === c && e.date >= pl[0].key).reduce((s, e) => s + e.amount, 0) }));
  const maxCat = Math.max(...byCategory.map((b) => b.amount), 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="Profit & loss for the last 6 months." actions={<Button onClick={() => setAdding(true)}>+ Add Expense</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi tone="green" icon={<path d="M3 14l4.5-4.5 3 3L17 6M12 6h5v5" />} label="Revenue (6M)" value={money(t.revenue)} />
        <Kpi tone="blue" icon={<path d="M3 6h14l-1 10H4zM7 6V4h6v2" />} label="Cost of goods" value={money(t.cogs)} />
        <Kpi tone="red" icon={<path d="M3 6l4.5 4.5 3-3L17 14M12 14h5V9" />} label="Expenses" value={money(t.expenses)} />
        <Kpi tone="orange" icon={<path d="M10 2v16M14 5.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5S7.8 8 10 8.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" />} label="Net profit" value={money(t.profit)} note={`${margin.toFixed(1)}% margin`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle>Revenue vs Expenses</CardTitle>
          <div className="h-[280px] px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pl} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => compact(v)} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(v) => money(Number(v))} cursor={{ fill: "#FAFBFC" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#F15A24" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#FFC9B0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#12B76A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Expenses by Category</CardTitle>
          <div className="px-5 pb-5 space-y-3">
            {byCategory.map((b) => (
              <div key={b.c}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{b.c}</span><span className="font-semibold tabular-nums">{money(b.amount)}</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#F15A24] rounded-full" style={{ width: `${(b.amount / maxCat) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardTitle>Profit &amp; Loss</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-y border-gray-100">
              <tr><Th>Month</Th><Th right>Revenue</Th><Th right>Cost of goods</Th><Th right>Gross profit</Th><Th right>Expenses</Th><Th right>Net profit</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pl.map((m) => (
                <tr key={m.key}>
                  <Td className="font-medium">{m.label}</Td>
                  <Td right>{money(m.revenue)}</Td>
                  <Td right className="text-gray-500">{money(m.cogs)}</Td>
                  <Td right>{money(m.revenue - m.cogs)}</Td>
                  <Td right className="text-gray-500">{money(m.expenses)}</Td>
                  <Td right className={`font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{money(m.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardTitle>Recent Expenses</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-y border-gray-100">
              <tr><Th>Date</Th><Th>Category</Th><Th>Description</Th><Th right>Amount</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map((e) => (
                <tr key={e.id}>
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</Td>
                  <Td><span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{e.category}</span></Td>
                  <Td>{e.description}</Td>
                  <Td right className="font-semibold">{money(e.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {adding && (
        <Modal title="Add Expense" onClose={() => setAdding(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const amount = Number(f.get("amount"));
              if (!(amount > 0)) return;
              addExpense({ date: String(f.get("date")), category: String(f.get("category")) as ExpenseCategory, description: String(f.get("description") ?? "").trim() || "Expense", amount });
              setAdding(false);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><input name="date" type="date" defaultValue={todayISO()} className={inputCls} /></Field>
              <Field label="Category">
                <select name="category" className={inputCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </Field>
            </div>
            <Field label="Description"><input name="description" className={inputCls} placeholder="e.g. Fuel for delivery van" /></Field>
            <Field label="Amount (Rs)"><input name="amount" type="number" min={1} required className={inputCls} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button type="submit">Save Expense</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
