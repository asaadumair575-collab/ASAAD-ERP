"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useOrderRows } from "@/lib/demo/store";
import { Card, Kpi, PageHeader, Td, Th, fmtDate, inputCls, money } from "../_components/ui";

const SEGMENTS = ["All", "Repeat", "New", "High return"] as const;

export default function CustomersPage() {
  const rows = useOrderRows();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<(typeof SEGMENTS)[number]>("All");

  const customers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; phone: string; city: string; orders: number; spent: number; returned: number; last: string; lastOrderId: number }>();
    for (const r of rows) {
      if (!r.customer) continue;
      const c = map.get(r.customerId) ?? { id: r.customerId, name: r.customer.name, phone: r.customer.phone, city: r.customer.city, orders: 0, spent: 0, returned: 0, last: "", lastOrderId: r.id };
      c.orders++;
      if (r.status === "Delivered") c.spent += r.total;
      if (r.status === "Returned") c.returned++;
      if (r.createdAt > c.last) {
        c.last = r.createdAt;
        c.lastOrderId = r.id;
      }
      map.set(r.customerId, c);
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  }, [rows]);

  const repeat = customers.filter((c) => c.orders > 1).length;
  const qq = q.trim().toLowerCase();
  const list = customers.filter(
    (c) =>
      (seg === "All" || (seg === "Repeat" && c.orders > 1) || (seg === "New" && c.orders === 1) || (seg === "High return" && c.returned > 0 && c.returned / c.orders >= 0.5)) &&
      (!qq || `${c.name} ${c.phone} ${c.city}`.toLowerCase().includes(qq)),
  );
  const totalSpent = customers.reduce((s, c) => s + c.spent, 0);

  return (
    <div>
      <PageHeader title="Customers" subtitle="Everyone who ordered from your store, synced from Shopify." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi tone="blue" icon={<path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1.5 17a5.5 5.5 0 0 1 11 0" />} label="Total customers" value={customers.length.toLocaleString()} />
        <Kpi tone="green" icon={<path d="M3 10a7 7 0 0 1 12-4.9L17 7M17 3v4h-4" />} label="Repeat customers" value={repeat.toLocaleString()} note={`${customers.length ? ((repeat / customers.length) * 100).toFixed(0) : 0}% repeat`} />
        <Kpi tone="violet" icon={<path d="M2 5h16v10H2zM2 8h16" />} label="Avg. customer value" value={money(customers.length ? totalSpent / customers.length : 0)} />
        <Kpi tone="red" icon={<path d="M10 3l8 14H2L10 3zM10 8v4" />} label="High-return customers" value={customers.filter((c) => c.returned > 0 && c.returned / c.orders >= 0.5).length} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {SEGMENTS.map((s) => (
              <button key={s} type="button" onClick={() => setSeg(s)} className={`text-sm font-medium px-3 py-1.5 rounded-lg ${seg === s ? "bg-[#F15A24] text-white" : "text-gray-600 hover:bg-gray-50"}`}>{s}</button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, city…" className={`${inputCls} sm:w-64 bg-gray-50`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-b border-gray-100">
              <tr><Th>Customer</Th><Th>City</Th><Th right>Orders</Th><Th right>Returned</Th><Th right>Total spent</Th><Th>Last order</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.slice(0, 100).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-[#FFF1EA] text-[#D9480F] text-xs font-semibold flex items-center justify-center shrink-0">{c.name.split(" ").map((w) => w[0]).join("")}</span>
                      <div>
                        <p className="font-medium text-gray-900">{c.name} {c.orders > 1 && <span className="ml-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">REPEAT</span>}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-600">{c.city}</Td>
                  <Td right>{c.orders}</Td>
                  <Td right className={c.returned ? "text-red-500" : "text-gray-400"}>{c.returned}</Td>
                  <Td right className="font-semibold">{money(c.spent)}</Td>
                  <Td><Link href={`/demo/orders/${c.lastOrderId}`} className="text-gray-500 hover:text-[#F15A24]">{fmtDate(c.last)}</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
