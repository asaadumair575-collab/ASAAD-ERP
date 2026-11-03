"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COURIERS, type Courier } from "@/lib/demo/data";
import { useOrderRows } from "@/lib/demo/store";
import { Card, CourierBadge, PageHeader, StatusBadge, Td, Th, fmtDateTime, inputCls, money, daysSince } from "../_components/ui";

const TABS = ["In Transit", "Delivered", "Returned", "All"] as const;

export default function ShipmentsPage() {
  const rows = useOrderRows();
  const [tab, setTab] = useState<(typeof TABS)[number]>("In Transit");
  const [courier, setCourier] = useState<"" | Courier>("");
  const [q, setQ] = useState("");

  const shipped = useMemo(() => rows.filter((r) => r.courier), [rows]);
  const summary = COURIERS.map((c) => {
    const mine = shipped.filter((r) => r.courier === c);
    return {
      c,
      inTransit: mine.filter((r) => r.status === "Shipped").length,
      delivered: mine.filter((r) => r.status === "Delivered").length,
      returned: mine.filter((r) => r.status === "Returned").length,
      cod: mine.filter((r) => r.payment === "COD" && r.status === "Shipped").reduce((s, r) => s + r.total, 0),
    };
  });

  const status = tab === "In Transit" ? "Shipped" : tab === "All" ? null : tab;
  const list = shipped.filter(
    (r) => (!status || r.status === status) && (!courier || r.courier === courier) && (!q || `${r.tracking} ${r.number} ${r.customer?.name}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader title="Shipments" subtitle="Every parcel booked with your couriers, tracked in one place." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {summary.map((s) => (
          <Card key={s.c} className="p-5">
            <div className="flex items-center justify-between">
              <CourierBadge courier={s.c} />
              <span className="text-xs text-emerald-600 font-semibold">● Connected</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div><p className="text-xl font-bold">{s.inTransit}</p><p className="text-xs text-gray-500">In transit</p></div>
              <div><p className="text-xl font-bold text-emerald-600">{s.delivered}</p><p className="text-xs text-gray-500">Delivered</p></div>
              <div><p className="text-xl font-bold text-red-500">{s.returned}</p><p className="text-xs text-gray-500">Returned</p></div>
            </div>
            <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">COD in transit: <span className="font-semibold text-gray-900">{money(s.cod)}</span></p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`text-sm font-medium px-3 py-1.5 rounded-lg ${tab === t ? "bg-[#F15A24] text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={courier} onChange={(e) => setCourier(e.target.value as "" | Courier)} className={`${inputCls} w-auto bg-gray-50`}>
              <option value="">All couriers</option>
              {COURIERS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tracking or order #" className={`${inputCls} sm:w-56 bg-gray-50`} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-b border-gray-100">
              <tr><Th>Tracking</Th><Th>Order</Th><Th>Customer</Th><Th>Courier</Th><Th>Booked</Th><Th right>Days</Th><Th right>COD</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.slice(0, 100).map((r) => {
                const booked = r.timeline.find((t) => t.status.startsWith("Booked"))?.at ?? r.createdAt;
                const d = daysSince(booked);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <Td className="font-mono text-xs">{r.tracking}</Td>
                    <Td><Link href={`/demo/orders/${r.id}`} className="font-semibold hover:text-[#F15A24]">{r.number}</Link></Td>
                    <Td>{r.customer?.name}<div className="text-xs text-gray-400">{r.customer?.city}</div></Td>
                    <Td><CourierBadge courier={r.courier} /></Td>
                    <Td className="text-gray-500 whitespace-nowrap">{fmtDateTime(booked)}</Td>
                    <Td right className={r.status === "Shipped" && d > 4 ? "text-red-600 font-semibold" : "text-gray-600"}>{r.status === "Shipped" ? `${d}d` : "—"}</Td>
                    <Td right>{r.payment === "COD" ? money(r.total) : <span className="text-emerald-600 text-xs font-semibold">Prepaid</span>}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No shipments here.</p>}
        </div>
      </Card>
    </div>
  );
}
