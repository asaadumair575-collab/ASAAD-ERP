"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { COURIERS, subtotal, type Courier } from "@/lib/demo/data";
import { useDemo, useOrderRows } from "@/lib/demo/store";
import { Button, Card, CardTitle, CourierBadge, ShopifyBadge, StatusBadge, fmtDateTime, inputCls, money } from "../../_components/ui";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const rows = useOrderRows();
  const products = useDemo((s) => s.products);
  const couriers = useDemo((s) => s.integrations.couriers);
  const { confirmOrder, cancelOrder, bookOrders, markDelivered, markReturned, toast } = useDemo.getState();
  const connected = COURIERS.filter((c) => couriers[c]);
  const [courier, setCourier] = useState<Courier>(connected[0] ?? "PostEx");

  const o = rows.find((r) => r.id === Number(id));
  if (!o) return <p className="text-gray-500">Order not found. <Link href="/demo/orders" className="text-[#F15A24]">Back to orders</Link></p>;
  const c = o.customer;
  const pastOrders = rows.filter((r) => r.customerId === o.customerId);

  return (
    <div className="space-y-6">
      <Link href="/demo/orders" className="text-sm text-gray-400 hover:text-gray-700">← Orders</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Order {o.number}</h1>
            <StatusBadge status={o.status} />
            <ShopifyBadge />
          </div>
          <p className="text-sm text-gray-500 mt-1">Placed {fmtDateTime(o.createdAt)} · {o.payment === "COD" ? "Cash on Delivery" : "Paid online"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {o.status === "New" && <Button variant="secondary" onClick={() => { confirmOrder(o.id); toast(`${o.number} confirmed`); }}>Confirm Order</Button>}
          {(o.status === "New" || o.status === "Confirmed") && (
            <>
              <select value={courier} onChange={(e) => setCourier(e.target.value as Courier)} className={`${inputCls} w-auto`}>
                {connected.map((x) => <option key={x}>{x}</option>)}
              </select>
              <Button onClick={() => { bookOrders([o.id], courier); toast(`${o.number} booked with ${courier}`); }} disabled={!connected.length}>Book with {courier}</Button>
              <Button variant="secondary" onClick={() => { if (confirm("Cancel this order?")) cancelOrder(o.id); }}>Cancel</Button>
            </>
          )}
          {o.status === "Shipped" && (
            <>
              <Button variant="secondary" onClick={() => window.print()}>Print Airway Bill</Button>
              <Button variant="secondary" onClick={() => markReturned(o.id)}>Mark Returned</Button>
              <Button onClick={() => markDelivered(o.id)}>Mark Delivered</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardTitle>Items</CardTitle>
            <div className="divide-y divide-gray-50 border-t border-gray-100">
              {o.items.map((it) => {
                const p = products.find((x) => x.id === it.productId);
                return (
                  <div key={it.productId} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">{p?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{it.name}</p>
                      <p className="text-xs text-gray-400">{p?.sku}</p>
                    </div>
                    <span className="text-sm text-gray-500">{it.qty} × {money(it.price)}</span>
                    <span className="font-semibold tabular-nums w-24 text-right">{money(it.qty * it.price)}</span>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 bg-[#FAFBFC] border-t border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="tabular-nums">{money(subtotal(o))}</span></div>
              {o.discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span className="tabular-nums">− {money(o.discount)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span className="tabular-nums">{money(o.shippingFee)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><span>Total {o.payment === "COD" ? "(collect on delivery)" : "(paid)"}</span><span className="tabular-nums">{money(o.total)}</span></div>
            </div>
          </Card>

          <Card>
            <CardTitle>Timeline</CardTitle>
            <ol className="px-5 pb-5 space-y-4">
              {[...o.timeline].reverse().map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${i === 0 ? "bg-[#F15A24] ring-4 ring-[#FFF1EA]" : "bg-gray-300"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.status}</p>
                    <p className="text-xs text-gray-400">{fmtDateTime(t.at)}{t.note ? ` · ${t.note}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Customer</CardTitle>
            <div className="px-5 pb-5 space-y-1 text-sm">
              <p className="font-semibold text-gray-900">{c?.name}</p>
              <p className="text-gray-500">{c?.phone}</p>
              <p className="text-gray-500">{c?.email}</p>
              <p className="text-gray-500 pt-2">{o.address}</p>
              <p className="pt-2 text-xs text-gray-400">{pastOrders.length} order{pastOrders.length === 1 ? "" : "s"} from this customer</p>
            </div>
          </Card>
          <Card>
            <CardTitle>Shipment</CardTitle>
            <div className="px-5 pb-5 text-sm space-y-2">
              {o.courier ? (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Courier</span><CourierBadge courier={o.courier} /></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tracking</span><span className="font-mono">{o.tracking}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Courier charge</span><span>{money(o.courierCharge)}</span></div>
                  {o.payment === "COD" && (
                    <div className="flex justify-between"><span className="text-gray-500">COD</span><span className={o.remitted ? "text-emerald-600 font-semibold" : "text-[#D9480F] font-semibold"}>{o.remitted ? "Received" : o.status === "Returned" ? "Not collected" : "Pending"}</span></div>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Not booked yet. Confirm the order and book it with a courier — the tracking number is created automatically.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
