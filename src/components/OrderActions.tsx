"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Courier } from "@/generated/prisma/client";
import { bookOrders, cancelOrders, confirmOrders, refreshShipments, setDeliveryOutcome, type Result } from "@/app/app/actions";
import { Button, selectCls } from "./ui";

export default function OrderActions({
  orderId, status, shipmentId, couriers,
}: { orderId: number; status: string; shipmentId: number | null; couriers: { value: Courier; label: string }[] }) {
  const router = useRouter();
  const [courier, setCourier] = useState<Courier | "">(couriers[0]?.value ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result | void>) =>
    start(async () => {
      const r = await fn();
      if (r) setResult(r);
      router.refresh();
    });
  const open = status === "NEW" || status === "CONFIRMED";
  const moving = status === "BOOKED" || status === "IN_TRANSIT";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "NEW" && <Button variant="secondary" disabled={pending} onClick={() => run(() => confirmOrders([orderId]))}>Confirm</Button>}
        {open && couriers.length > 0 && (
          <>
            <select value={courier} onChange={(e) => setCourier(e.target.value as Courier)} className={`${selectCls}`}>
              {couriers.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <Button disabled={pending || !courier} onClick={() => courier && run(() => bookOrders([orderId], courier))}>{pending ? "Booking…" : "Book parcel"}</Button>
          </>
        )}
        {open && <Button variant="danger" disabled={pending} onClick={() => confirm("Cancel this order?") && run(() => cancelOrders([orderId]))}>Cancel order</Button>}
        {moving && shipmentId && <Button variant="secondary" disabled={pending} onClick={() => run(() => refreshShipments([shipmentId]))}>{pending ? "Checking…" : "Refresh tracking"}</Button>}
        {moving && (
          <>
            <Button variant="ghost" disabled={pending} onClick={() => confirm("Mark this parcel as delivered?") && run(() => setDeliveryOutcome(orderId, "DELIVERED"))}>Mark delivered</Button>
            <Button variant="ghost" disabled={pending} onClick={() => confirm("Mark this parcel as returned?") && run(() => setDeliveryOutcome(orderId, "RETURNED"))}>Mark returned</Button>
          </>
        )}
      </div>
      {result && <p className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>{result.message}</p>}
    </div>
  );
}
