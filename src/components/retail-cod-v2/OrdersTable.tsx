"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Package, Phone, MapPin, ChevronDown, Loader2, MessageCircle, Clock3 } from "lucide-react";
import { useOrderSelection } from "@/lib/retail-cod-v2/store";
import { setOrderStage, bulkSetOrderStage } from "@/lib/retail-cod-v2/actions";
import { STAGES, type OrderStage } from "@/lib/retail-cod-v2/stages";
import { STAGE_META } from "@/lib/retail-cod-v2/stageMeta";
import StageBadge from "./StageBadge";

export type OrderRow = {
  id: number;
  orderLabel: string;
  customerName: string;
  phone: string | null;
  city: string | null;
  totalAmount: number;
  date: string;
  items: string;
  trackingNumber: string | null;
  stage: string;
  stageUpdatedAt: string;
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

// Age since the order last changed stage — the whole point of this queue
// view is "who's been waiting too long", so this needs to jump out visually
// rather than sit as another plain date column.
function Aging({ since }: { since: string }) {
  const hours = (Date.now() - new Date(since).getTime()) / 3_600_000;
  const label = hours < 1 ? "<1h" : hours < 24 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;
  const urgency = hours >= 24 ? "text-red-600 bg-red-50 border-red-200" : hours >= 8 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-gray-500 bg-gray-50 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${urgency}`}>
      <Clock3 className="w-3 h-3" />
      {label}
    </span>
  );
}

function StageMoveSelect({ orderId, currentStage }: { orderId: number; currentStage: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const stage = e.target.value as OrderStage;
    startTransition(async () => {
      await setOrderStage(orderId, stage);
    });
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentStage}
        onChange={handleChange}
        disabled={isPending}
        className="appearance-none text-xs font-medium border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer disabled:opacity-50"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>{STAGE_META[s].label}</option>
        ))}
      </select>
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 absolute right-2 animate-spin text-gray-400 pointer-events-none" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-gray-400 pointer-events-none" />
      )}
    </div>
  );
}

export default function OrdersTable({ orders, showStageColumn = true }: { orders: OrderRow[]; showStageColumn?: boolean }) {
  const { selected, toggle, toggleAll, clear } = useOrderSelection();
  const [bulkPending, startBulkTransition] = useTransition();

  // Selection is per-page-visit state, not something that should survive
  // navigating away — clear it whenever the underlying order list changes.
  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => o.id).join(",")]);

  const ids = orders.map((o) => o.id);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));

  function bulkMove(stage: OrderStage) {
    const idsToMove = Array.from(selected);
    startBulkTransition(async () => {
      await bulkSetOrderStage(idsToMove, stage);
      clear();
    });
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
        <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-base font-semibold text-gray-700">No orders here</p>
        <p className="text-sm text-gray-400 mt-1">Orders will show up once they reach this stage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#16202E] text-white rounded-xl px-4 py-2.5 sm:sticky sm:top-0 z-10">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={clear} className="text-xs text-white/60 hover:text-white transition-colors px-1.5">Clear</button>
            <span className="text-xs text-white/40 mr-1">Move to:</span>
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={bulkPending}
                onClick={() => bulkMove(s)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                {STAGE_META[s].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium text-left">
              <th className="py-2.5 pl-4 pr-2 w-8">
                <input type="checkbox" checked={allChecked} onChange={() => toggleAll(ids)} className="rounded border-gray-300" />
              </th>
              <th className="py-2.5 px-3">Order</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Items</th>
              <th className="py-2.5 px-3 text-right">Total</th>
              <th className="py-2.5 px-3">Waiting</th>
              {showStageColumn && <th className="py-2.5 px-3">Stage</th>}
              <th className="py-2.5 px-3 text-center">Contact</th>
              <th className="py-2.5 pr-4 text-right">Move</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => {
              const phoneDigits = o.phone?.replace(/\D/g, "");
              return (
                <tr key={o.id} className={`hover:bg-gray-50/70 transition-colors ${selected.has(o.id) ? "bg-blue-50/40" : ""}`}>
                  <td className="py-2.5 pl-4 pr-2">
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} className="rounded border-gray-300" />
                  </td>
                  <td className="py-2.5 px-3">
                    <Link href={`/ecommerce/orders/${o.id}`} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-xs">
                      {o.orderLabel}
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-0.5">{o.date}</p>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="text-gray-900 text-xs font-medium">{o.customerName}</p>
                    <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-gray-400">
                      {o.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{o.phone}</span>}
                      {o.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{o.city}</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs max-w-[220px] truncate">{o.items}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900 text-xs">Rs {fmt(o.totalAmount)}</td>
                  <td className="py-2.5 px-3"><Aging since={o.stageUpdatedAt} /></td>
                  {showStageColumn && (
                    <td className="py-2.5 px-3"><StageBadge stage={o.stage} /></td>
                  )}
                  <td className="py-2.5 px-3">
                    {phoneDigits && (
                      <div className="flex items-center justify-center gap-1">
                        <a href={`tel:${phoneDigits}`} title="Call" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <StageMoveSelect orderId={o.id} currentStage={o.stage} />
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
