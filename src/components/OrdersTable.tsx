"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { Courier } from "@/generated/prisma/client";
import { bookOrders, cancelOrders, confirmOrders, type Result } from "@/app/app/actions";
import { Badge, Button, btn, selectCls } from "./ui";

export type OrderRow = {
  id: number;
  number: string;
  placedAt: string;
  customerName: string;
  phone: string | null;
  city: string | null;
  items: number;
  total: string;
  payment: string;
  status: string;
  statusLabel: string;
  statusCls: string;
  courier: string | null;
  tracking: string | null;
  returns: number;
  blocked: boolean;
};

export default function OrdersTable({ rows, couriers, empty }: { rows: OrderRow[]; couriers: { value: Courier; label: string }[]; empty: ReactNode }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [courier, setCourier] = useState<Courier | "">(couriers[0]?.value ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const selectable = rows.filter((r) => ["NEW", "CONFIRMED", "BOOKED"].includes(r.status));
  const allOn = selectable.length > 0 && selectable.every((r) => selected.includes(r.id));
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      setSelected([]);
      router.refresh();
    });

  return (
    <div>
      {result && (
        <div className={`mx-4 mt-3 rounded-xl border px-3 py-2 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-950 text-white rounded-xl mx-3 my-2">
          <span className="text-sm font-semibold mr-1">{selected.length} selected</span>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => confirmOrders(selected))}>Confirm</Button>
          {couriers.length > 0 ? (
            <>
              <select value={courier} onChange={(e) => setCourier(e.target.value as Courier)} className={`${selectCls} h-8 text-xs`}>
                {couriers.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <Button size="sm" variant="secondary" className="!bg-emerald-500 !text-white !border-emerald-500 hover:!bg-emerald-600" disabled={pending || !courier} onClick={() => courier && run(() => bookOrders(selected, courier))}>
                {pending ? "Working…" : "Book parcels"}
              </Button>
            </>
          ) : (
            <Link href="/app/integrations" className="text-xs text-gray-300 underline">Connect a courier to book parcels</Link>
          )}
          <a href={`/print/slips?ids=${selected.join(",")}`} target="_blank" rel="noreferrer" className={btn("secondary", "sm")}>Print slips</a>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => confirm("Cancel the selected orders?") && run(() => cancelOrders(selected))}>Cancel</Button>
          <button type="button" className="ml-auto text-xs text-gray-400 hover:text-white" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}
      {rows.length === 0 ? empty : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-10 px-4 py-3 bg-gray-50/70 border-y border-gray-100">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allOn}
                  disabled={!selectable.length}
                  onChange={(e) => setSelected(e.target.checked ? selectable.map((r) => r.id) : [])}
                  className="accent-gray-950"
                />
              </th>
              {["Order", "Date", "Customer", "City", "Items", "Total", "Status", "Courier"].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50/70 border-y border-gray-100 whitespace-nowrap ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const can = ["NEW", "CONFIRMED", "BOOKED"].includes(r.status);
              return (
                <tr key={r.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3.5 border-b border-gray-100">
                    {can && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.number}`}
                        checked={selected.includes(r.id)}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
                        className="accent-gray-950"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 whitespace-nowrap"><Link href={`/app/orders/${r.id}`} className="font-medium text-gray-900 hover:underline">{r.number}</Link></td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-gray-500 whitespace-nowrap">{r.placedAt}</td>
                  <td className="px-4 py-3.5 border-b border-gray-100">
                    <div className="text-gray-900">{r.customerName}</div>
                    <div className="text-xs text-gray-500">{r.phone ?? "No phone"}{r.returns > 0 && <span className="ml-2 text-red-600 font-medium">{r.returns} past return{r.returns > 1 ? "s" : ""}</span>}{r.blocked && <span className="ml-2 rounded-full bg-red-600 text-white px-1.5 py-px text-[10px] font-semibold">BLOCKED</span>}</div>
                  </td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-gray-600">{r.city ?? <span className="text-red-600">Missing</span>}</td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-gray-600">{r.items}</td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-right tabular-nums whitespace-nowrap">{r.total}<div className="text-xs text-gray-500">{r.payment}</div></td>
                  <td className="px-4 py-3.5 border-b border-gray-100"><Badge className={r.statusCls}>{r.statusLabel}</Badge></td>
                  <td className="px-4 py-3.5 border-b border-gray-100 text-gray-600 whitespace-nowrap">{r.courier ?? "—"}{r.tracking && <div className="text-xs text-gray-500 font-mono">{r.tracking}</div>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
