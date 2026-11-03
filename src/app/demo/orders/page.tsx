"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { COURIERS, ORDER_STATUSES, itemCount, type Courier, type OrderStatus } from "@/lib/demo/data";
import { useDemo, useOrderRows } from "@/lib/demo/store";
import { Button, Card, CourierBadge, PageHeader, ShopifyBadge, StatusBadge, Td, Th, fmtDateTime, inputCls, money } from "../_components/ui";

const PAGE = 50;

export default function OrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}

function Orders() {
  const params = useSearchParams();
  const router = useRouter();
  const rows = useOrderRows();
  const couriers = useDemo((s) => s.integrations.couriers);
  const confirmOrder = useDemo((s) => s.confirmOrder);
  const bookOrders = useDemo((s) => s.bookOrders);
  const clearUnread = useDemo((s) => s.clearUnread);
  const toast = useDemo((s) => s.toast);

  const initial = params.get("status") as OrderStatus | null;
  const [tab, setTab] = useState<"All" | OrderStatus>(initial && ORDER_STATUSES.includes(initial) ? initial : "All");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const connected = COURIERS.filter((c) => couriers[c]);
  const [courier, setCourier] = useState<Courier>(connected[0] ?? "PostEx");

  useEffect(() => clearUnread(), [clearUnread]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const qq = q.trim().toLowerCase();
  const list = rows.filter(
    (r) =>
      (tab === "All" || r.status === tab) &&
      (!qq || [r.number, r.customer?.name, r.customer?.phone, r.customer?.city, r.tracking].some((v) => v?.toLowerCase().includes(qq))),
  );
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);
  const selectable = (s: OrderStatus) => s === "New" || s === "Confirmed";
  const allShownSelected = shown.filter((r) => selectable(r.status)).every((r) => selected.includes(r.id)) && shown.some((r) => selectable(r.status));

  function bulkConfirm() {
    const ids = selected.filter((id) => rows.find((r) => r.id === id)?.status === "New");
    ids.forEach(confirmOrder);
    toast(`${ids.length} order${ids.length === 1 ? "" : "s"} confirmed`);
    setSelected([]);
  }
  function bulkBook() {
    bookOrders(selected, courier);
    toast(`${selected.length} order${selected.length === 1 ? "" : "s"} booked with ${courier} — tracking numbers generated`);
    setSelected([]);
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle="All orders from your Shopify store, in one place." />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {(["All", ...ORDER_STATUSES] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setPage(0);
                  setSelected([]);
                }}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg ${tab === t ? "bg-[#F15A24] text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t} <span className={tab === t ? "text-white/80" : "text-gray-400"}>{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Order #, name, phone, tracking…" className={`${inputCls} sm:w-72 bg-gray-50`} />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-[#FFF1EA] border-b border-[#FFE2D3]">
            <span className="text-sm font-semibold text-[#D9480F] mr-2">{selected.length} selected</span>
            <Button variant="secondary" onClick={bulkConfirm}>Confirm</Button>
            <select value={courier} onChange={(e) => setCourier(e.target.value as Courier)} className={`${inputCls} w-auto h-9`}>
              {connected.map((c) => <option key={c}>{c}</option>)}
            </select>
            <Button onClick={bulkBook} disabled={!connected.length}>Book with {courier}</Button>
            <button type="button" onClick={() => setSelected([])} className="text-sm text-gray-500 hover:text-gray-800 ml-auto">Clear</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-b border-gray-100">
              <tr>
                <th className="py-3 pl-5 w-8">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={(e) => {
                      const ids = shown.filter((r) => selectable(r.status)).map((r) => r.id);
                      setSelected((s) => (e.target.checked ? [...new Set([...s, ...ids])] : s.filter((id) => !ids.includes(id))));
                    }}
                    className="accent-[#F15A24]"
                    aria-label="Select all"
                  />
                </th>
                <Th>Order</Th>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Items</Th>
                <Th>Payment</Th>
                <Th right>Total</Th>
                <Th>Courier</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shown.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => router.push(`/demo/orders/${r.id}`)}>
                  <td className="py-3 pl-5" onClick={(e) => e.stopPropagation()}>
                    {selectable(r.status) && (
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((id) => id !== r.id)))}
                        className="accent-[#F15A24]"
                        aria-label={`Select ${r.number}`}
                      />
                    )}
                  </td>
                  <Td><Link href={`/demo/orders/${r.id}`} className="font-semibold hover:text-[#F15A24]">{r.number}</Link><div className="mt-0.5"><ShopifyBadge /></div></Td>
                  <Td className="text-gray-500 whitespace-nowrap">{fmtDateTime(r.createdAt)}</Td>
                  <Td>{r.customer?.name}<div className="text-xs text-gray-400">{r.customer?.city} · {r.customer?.phone}</div></Td>
                  <Td className="text-gray-600">{itemCount(r)} item{itemCount(r) === 1 ? "" : "s"}</Td>
                  <Td><span className={`text-xs font-semibold ${r.payment === "COD" ? "text-gray-700" : "text-emerald-600"}`}>{r.payment}</span></Td>
                  <Td right className="font-semibold">{money(r.total)}</Td>
                  <Td><CourierBadge courier={r.courier} />{r.tracking && <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{r.tracking}</div>}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No orders found.</p>}
        </div>

        {list.length > PAGE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{page * PAGE + 1}–{Math.min(list.length, (page + 1) * PAGE)} of {list.length}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE >= list.length}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
