"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useDemo, useInvoiceRows } from "@/lib/demo/store";
import { Button, Card, Field, Modal, PageHeader, Td, Th, inputCls, money } from "../_components/ui";

export default function CustomersPage() {
  return (
    <Suspense>
      <Customers />
    </Suspense>
  );
}

function Customers() {
  const params = useSearchParams();
  const router = useRouter();
  const customers = useDemo((s) => s.customers);
  const addCustomer = useDemo((s) => s.addCustomer);
  const rows = useInvoiceRows();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [city, setCity] = useState("");
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    const totals = new Map<number, { sales: number; balance: number; count: number; last: string }>();
    for (const r of rows) {
      const t = totals.get(r.customerId) ?? { sales: 0, balance: 0, count: 0, last: "" };
      t.sales += r.total;
      t.balance += r.balance;
      t.count++;
      if (r.date > t.last) t.last = r.date;
      totals.set(r.customerId, t);
    }
    const qq = q.trim().toLowerCase();
    return customers
      .filter((c) => !city || c.city === city)
      .filter((c) => !qq || [c.name, c.company, c.phone, c.code].some((v) => v.toLowerCase().includes(qq)))
      .map((c) => ({ ...c, ...(totals.get(c.id) ?? { sales: 0, balance: 0, count: 0, last: "" }) }))
      .sort((a, b) => b.sales - a.sales);
  }, [customers, rows, q, city]);

  const cities = [...new Set(customers.map((c) => c.city))].sort();
  const totalBalance = list.reduce((s, c) => s + c.balance, 0);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${list.length} customers · ${money(totalBalance)} receivable`}
        actions={<Button onClick={() => setAdding(true)}>+ Add Customer</Button>}
      />

      <Card className="p-2.5 mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, phone…" className={`${inputCls} flex-1 min-w-[180px] bg-gray-50`} />
        <select value={city} onChange={(e) => setCity(e.target.value)} className={`${inputCls} w-auto bg-gray-50`}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-b border-gray-100">
              <tr>
                <Th>Customer</Th>
                <Th>City</Th>
                <Th>Phone</Th>
                <Th right>Invoices</Th>
                <Th right>Total Sales</Th>
                <Th right>Balance</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => router.push(`/demo/customers/${c.id}`)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-[#FFF1EA] text-[#D9480F] text-xs font-semibold flex items-center justify-center shrink-0">
                        {c.name.split(" ").map((w) => w[0]).join("")}
                      </span>
                      <div>
                        <Link href={`/demo/customers/${c.id}`} className="font-medium text-gray-900 hover:text-[#F15A24]">{c.name}</Link>
                        <div className="text-xs text-gray-400">{c.company} · {c.code}</div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-600">{c.city}</Td>
                  <Td className="text-gray-600 whitespace-nowrap">{c.phone}</Td>
                  <Td right>{c.count}</Td>
                  <Td right className="font-semibold">{money(c.sales)}</Td>
                  <Td right className={c.balance > 0 ? "text-[#D9480F] font-semibold" : "text-emerald-600"}>{c.balance > 0 ? money(c.balance) : "Clear"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {adding && (
        <Modal title="Add Customer" onClose={() => setAdding(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const get = (k: string) => String(f.get(k) ?? "").trim();
              const id = addCustomer({ name: get("name"), company: get("company"), city: get("city"), phone: get("phone"), email: get("email") });
              setAdding(false);
              router.push(`/demo/customers/${id}`);
            }}
          >
            <Field label="Full name"><input name="name" required className={inputCls} placeholder="e.g. Ahmed Khan" /></Field>
            <Field label="Company"><input name="company" className={inputCls} placeholder="e.g. Khan Traders" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><input name="city" required className={inputCls} placeholder="Lahore" /></Field>
              <Field label="Phone"><input name="phone" className={inputCls} placeholder="0300-1234567" /></Field>
            </div>
            <Field label="Email"><input name="email" type="email" className={inputCls} placeholder="name@company.com" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button type="submit">Save Customer</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
