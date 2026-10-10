"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { Card, Kpi, PageHeader, Td, Th, fmtDate, inputCls, money } from "../_components/ui";

export default function PaymentsPage() {
  const payments = useDemo((s) => s.payments);
  const invoices = useDemo((s) => s.invoices);
  const customers = useDemo((s) => s.customers);
  const [method, setMethod] = useState("");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const inv = new Map(invoices.map((i) => [i.id, i]));
    const cus = new Map(customers.map((c) => [c.id, c]));
    return payments
      .map((p) => {
        const i = inv.get(p.invoiceId);
        return { ...p, invoice: i, customer: i ? cus.get(i.customerId) : undefined };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  }, [payments, invoices, customers]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const thisMonth = rows.filter((r) => r.date >= monthStart);
  const byMethod = (m: string) => thisMonth.filter((r) => r.method === m).reduce((s, r) => s + r.amount, 0);
  const list = rows.filter((r) => (!method || r.method === method) && (!q || `${r.customer?.name} ${r.invoice?.number} ${r.reference}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageHeader title="Payments" subtitle="Every payment received from customers." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi tone="green" icon={<path d="M2 5h16v10H2zM2 8h16M5 12h3" />} label="Received this month" value={money(thisMonth.reduce((s, r) => s + r.amount, 0))} />
        <Kpi tone="blue" icon={<path d="M3 8h14M3 8l7-5 7 5M5 8v7M10 8v7M15 8v7M3 16h14" />} label="Bank transfers" value={money(byMethod("Bank Transfer"))} />
        <Kpi tone="violet" icon={<path d="M2 6h16v8H2zM10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />} label="Cash" value={money(byMethod("Cash"))} />
        <Kpi tone="orange" icon={<path d="M3 5h14v10H3zM6 12h5" />} label="Cheques" value={money(byMethod("Cheque"))} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, invoice, reference…" className={`${inputCls} flex-1 min-w-[180px] bg-gray-50`} />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} w-auto bg-gray-50`}>
            <option value="">All methods</option>
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>Cheque</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-b border-gray-100">
              <tr>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Invoice</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</Td>
                  <Td>{r.customer?.name}</Td>
                  <Td>{r.invoice && <Link href={`/demo/invoices/${r.invoice.id}`} className="font-medium hover:text-[#F15A24]">{r.invoice.number}</Link>}</Td>
                  <Td className="text-gray-600">{r.method}</Td>
                  <Td className="text-gray-400">{r.reference}</Td>
                  <Td right className="font-semibold text-emerald-600">{money(r.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
