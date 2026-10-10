"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useDemo, useInvoiceRows } from "@/lib/demo/store";
import { Button, Card, CardTitle, Kpi, StatusBadge, Td, Th, fmtDate, money } from "../../_components/ui";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const customer = useDemo((s) => s.customers.find((c) => c.id === Number(id)));
  const payments = useDemo((s) => s.payments);
  const rows = useInvoiceRows();

  const invoices = useMemo(() => rows.filter((r) => r.customerId === Number(id)), [rows, id]);

  // Ledger: invoices are debits, payments are credits, with a running balance.
  const ledger = useMemo(() => {
    const ids = new Set(invoices.map((i) => i.id));
    const numberOf = new Map(invoices.map((i) => [i.id, i.number]));
    const entries = [
      ...invoices.map((i) => ({ date: i.date, text: `Invoice ${i.number}`, debit: i.total, credit: 0, href: `/demo/invoices/${i.id}` })),
      ...payments.filter((p) => ids.has(p.invoiceId)).map((p) => ({
        date: p.date,
        text: `Payment — ${numberOf.get(p.invoiceId)} (${p.method})`,
        debit: 0,
        credit: p.amount,
        href: `/demo/invoices/${p.invoiceId}`,
      })),
    ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.debit - a.debit));
    const out: ((typeof entries)[number] & { balance: number })[] = [];
    for (const e of entries) out.push({ ...e, balance: (out.at(-1)?.balance ?? 0) + e.debit - e.credit });
    return out;
  }, [invoices, payments]);

  if (!customer) return <p className="text-gray-500">Customer not found. <Link href="/demo/customers" className="text-[#F15A24]">Back to customers</Link></p>;

  const sales = invoices.reduce((s, r) => s + r.total, 0);
  const paid = invoices.reduce((s, r) => s + r.paid, 0);

  return (
    <div className="space-y-6">
      <Link href="/demo/customers" className="text-sm text-gray-400 hover:text-gray-700">← Customers</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-[#FFF1EA] text-[#D9480F] text-lg font-bold flex items-center justify-center">
            {customer.name.split(" ").map((w) => w[0]).join("")}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-sm text-gray-500">{customer.company} · {customer.code}</p>
            <p className="text-sm text-gray-400 mt-0.5">{customer.city} · {customer.phone} · {customer.email}</p>
          </div>
        </div>
        <Button href={`/demo/invoices/new?customer=${customer.id}`}>+ New Invoice</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi tone="blue" icon={<path d="M5 2h7l4 4v12H5zM12 2v4h4" />} label="Invoices" value={invoices.length} />
        <Kpi tone="green" icon={<path d="M3 14l4.5-4.5 3 3L17 6M12 6h5v5" />} label="Total sales" value={money(sales)} />
        <Kpi tone="violet" icon={<path d="M2 5h16v10H2zM2 8h16" />} label="Received" value={money(paid)} />
        <Kpi tone="orange" icon={<path d="M10 3l8 14H2L10 3zM10 8v4" />} label="Balance due" value={money(sales - paid)} />
      </div>

      <Card className="overflow-hidden">
        <CardTitle>Ledger</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-y border-gray-100">
              <tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th right>Debit</Th>
                <Th right>Credit</Th>
                <Th right>Balance</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ledger.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50/60">
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</Td>
                  <Td><Link href={e.href} className="hover:text-[#F15A24]">{e.text}</Link></Td>
                  <Td right>{e.debit ? money(e.debit) : ""}</Td>
                  <Td right className="text-emerald-600">{e.credit ? money(e.credit) : ""}</Td>
                  <Td right className="font-semibold">{money(e.balance)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardTitle>Invoices</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-y border-gray-100">
              <tr>
                <Th>Invoice</Th>
                <Th>Date</Th>
                <Th right>Total</Th>
                <Th right>Paid</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <Td className="font-medium"><Link href={`/demo/invoices/${r.id}`} className="hover:text-[#F15A24]">{r.number}</Link></Td>
                  <Td className="text-gray-500">{fmtDate(r.date)}</Td>
                  <Td right>{money(r.total)}</Td>
                  <Td right>{money(r.paid)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
