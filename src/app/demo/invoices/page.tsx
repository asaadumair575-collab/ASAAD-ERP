"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { InvoiceStatus } from "@/lib/demo/data";
import { useInvoiceRows } from "@/lib/demo/store";
import { Button, Card, Kpi, PageHeader, StatusBadge, Td, Th, fmtDate, inputCls, money } from "../_components/ui";

const TABS: ("All" | InvoiceStatus)[] = ["All", "Paid", "Partial", "Unpaid", "Overdue"];

export default function InvoicesPage() {
  return (
    <Suspense>
      <Invoices />
    </Suspense>
  );
}

function Invoices() {
  const params = useSearchParams();
  const router = useRouter();
  const rows = useInvoiceRows();
  const initial = params.get("status");
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS.includes(initial as InvoiceStatus) ? (initial as InvoiceStatus) : "All");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const list = rows.filter((r) => (tab === "All" || r.status === tab) && (!q || `${r.number} ${r.customer?.name} ${r.customer?.company}`.toLowerCase().includes(q.toLowerCase())));
  const totals = {
    sales: rows.reduce((s, r) => s + r.total, 0),
    received: rows.reduce((s, r) => s + r.paid, 0),
    due: rows.reduce((s, r) => s + r.balance, 0),
    overdue: rows.filter((r) => r.status === "Overdue").reduce((s, r) => s + r.balance, 0),
  };

  return (
    <div>
      <PageHeader title="Sales & Invoices" subtitle="Create invoices, track payments and follow up on dues." actions={<Button href="/demo/invoices/new">+ New Invoice</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi tone="green" icon={<path d="M3 14l4.5-4.5 3 3L17 6M12 6h5v5" />} label="Total invoiced" value={money(totals.sales)} />
        <Kpi tone="violet" icon={<path d="M2 5h16v10H2zM2 8h16" />} label="Received" value={money(totals.received)} />
        <Kpi tone="orange" icon={<path d="M10 3l8 14H2L10 3zM10 8v4" />} label="Outstanding" value={money(totals.due)} />
        <Kpi tone="red" icon={<path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM10 6v4l3 2" />} label="Overdue" value={money(totals.overdue)} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg ${tab === t ? "bg-[#F15A24] text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t} <span className={tab === t ? "text-white/80" : "text-gray-400"}>{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice or customer…" className={`${inputCls} sm:w-64 bg-gray-50`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-b border-gray-100">
              <tr>
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Due</Th>
                <Th right>Total</Th>
                <Th right>Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => router.push(`/demo/invoices/${r.id}`)}>
                  <Td className="font-medium"><Link href={`/demo/invoices/${r.id}`} className="hover:text-[#F15A24]">{r.number}</Link></Td>
                  <Td>{r.customer?.name}<div className="text-xs text-gray-400">{r.customer?.company}</div></Td>
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</Td>
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDate(r.dueDate)}</Td>
                  <Td right className="font-semibold">{money(r.total)}</Td>
                  <Td right className={r.balance > 0 ? "text-[#D9480F]" : "text-gray-400"}>{r.balance > 0 ? money(r.balance) : "—"}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No invoices found.</p>}
        </div>
      </Card>
    </div>
  );
}
