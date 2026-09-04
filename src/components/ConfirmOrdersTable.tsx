"use client";

import { useState } from "react";
import Link from "next/link";
import MoveToDraftButton from "./MoveToDraftButton";
import BulkDispatchButton from "./BulkDispatchButton";
import DispatchListSelectedButton from "./DispatchListSelectedButton";
import PrintLabelsButton from "./PrintLabelsButton";

type Order = {
  id: number;
  customerName: string;
  phone: string | null;
  city: string | null;
  notes: string | null;
  date: Date;
  confirmedAt: Date | null;
  dispatchedAt: Date | null;
  totalAmount: number;
  status: string;
  returned: boolean;
  trackingNumber: string | null;
  packedAt: Date | null;
  items: { description: string; quantity: number }[];
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function ConfirmOrdersTable({ orders, weightByTracking = {} }: { orders: Order[]; weightByTracking?: Record<string, number> }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allIds = orders.map(o => o.id);
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id));

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 sm:sticky sm:top-0 z-10">
          <span className="text-sm text-orange-700 font-medium">{selected.size} order{selected.size > 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSelected(new Set())} className="text-xs text-orange-400 hover:text-orange-700 transition-colors py-1.5">Clear</button>
            <DispatchListSelectedButton selectedIds={Array.from(selected)} />
            {orders.some((o) => selected.has(o.id) && o.trackingNumber) && (
              <PrintLabelsButton selectedIds={orders.filter((o) => selected.has(o.id) && o.trackingNumber).map((o) => o.id)} />
            )}
            <BulkDispatchButton selectedIds={Array.from(selected)} orders={orders} />
          </div>
        </div>
      )}

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {orders.map((o) => {
          const orderLabel = o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`;
          const isSelected = selected.has(o.id);
          const dispatched = !!o.trackingNumber;
          return (
            <div key={o.id} className={`bg-white border rounded-xl shadow-sm p-3 ${isSelected ? "border-orange-300 bg-orange-50/50" : "border-gray-200"}`}>
              <div className="flex items-start gap-3">
                <label className="flex items-center justify-center w-11 h-11 -m-2.5 -mt-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(o.id)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/ecommerce/orders/${o.id}`} className="font-semibold text-gray-900 text-sm hover:text-blue-600">
                      {orderLabel}
                    </Link>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {(o.packedAt ?? o.dispatchedAt ?? o.confirmedAt ?? o.date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium mt-1">{o.customerName}</p>
                  {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {o.items.map(i => `${i.description} ×${i.quantity}`).join(", ")}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">Rs {fmt(o.totalAmount)}</span>
                    {o.returned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Returned
                      </span>
                    ) : dispatched && o.packedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Packed{o.trackingNumber && weightByTracking[o.trackingNumber] != null ? ` · ${weightByTracking[o.trackingNumber].toFixed(2)} kg` : ""}
                      </span>
                    ) : dispatched ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Booked
                      </span>
                    ) : o.status === "PAID" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Delivered
                      </span>
                    ) : o.status === "PARTIAL" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Confirmed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-100">
                    <Link href={`/ecommerce/orders/${o.id}`} className="text-xs text-blue-600 hover:underline font-medium py-1">
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium text-left">
              <th className="py-2.5 pl-4 pr-2 w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="py-2.5 px-3">Order</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Items</th>
              <th className="py-2.5 px-3 text-right">Total</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => {
              const orderLabel = o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`;
              const isSelected = selected.has(o.id);
              const dispatched = !!o.trackingNumber;
              return (
                <tr key={o.id} className={`hover:bg-gray-50 transition-colors group ${isSelected ? "bg-orange-50/50" : ""}`}>
                  <td className="py-2.5 pl-4 pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(o.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-gray-900 text-xs">
                    <Link href={`/ecommerce/orders/${o.id}`} className="hover:text-blue-600 hover:underline transition-colors">
                      {orderLabel}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">
                    {(o.packedAt ?? o.dispatchedAt ?? o.confirmedAt ?? o.date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="text-gray-900 text-xs font-medium">{o.customerName}</p>
                    {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                  </td>
                  <td className="py-2.5 px-3 text-gray-400 text-xs max-w-[180px] truncate">
                    {o.items.map(i => `${i.description} ×${i.quantity}`).join(", ")}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900 text-xs">Rs {fmt(o.totalAmount)}</td>
                  <td className="py-2.5 px-3">
                    {o.returned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Returned
                      </span>
                    ) : dispatched && o.packedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Packed{o.trackingNumber && weightByTracking[o.trackingNumber] != null ? ` · ${weightByTracking[o.trackingNumber].toFixed(2)} kg` : ""}
                      </span>
                    ) : dispatched ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Booked
                      </span>
                    ) : o.status === "PAID" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Delivered
                      </span>
                    ) : o.status === "PARTIAL" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Confirmed
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoveToDraftButton id={o.id} />
                      <Link href={`/ecommerce/orders/${o.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                        View →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
