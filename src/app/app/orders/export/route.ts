import type { OrderStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/format";

const STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];
const pk = (d: Date | null | undefined) => (d ? d.toLocaleString("en-GB", { timeZone: "Asia/Karachi" }) : "");

export async function GET(req: Request) {
  const user = await requireUser();
  const status = new URL(req.url).searchParams.get("status") as OrderStatus | null;
  const orders = await db.order.findMany({
    where: { tenantId: user.tenantId, ...(status && STATUSES.includes(status) ? { status } : {}) },
    orderBy: { placedAt: "desc" },
    include: { items: true, shipment: true },
    take: 20000,
  });
  const csv = toCsv(
    ["Order", "Date", "Source", "Customer", "Phone", "City", "Address", "Items", "Qty", "Subtotal", "Discount", "Shipping", "Total", "Payment", "Status", "Courier", "Tracking", "Courier status", "COD amount", "Courier charge", "COD received", "Delivered at", "Returned at"],
    orders.map((o) => [
      o.number, pk(o.placedAt), o.source === "SHOPIFY" ? "Shopify" : "Manual", o.customerName, o.phone, o.city, o.address,
      o.items.map((i) => `${i.title} x${i.qty}`).join("; "), o.items.reduce((s, i) => s + i.qty, 0),
      o.subtotal, o.discount, o.shippingFee, o.total, o.paymentMethod, ORDER_STATUS[o.status].label,
      o.shipment ? courierName(o.shipment.courier) : "", o.shipment?.trackingNumber, o.shipment?.courierStatus,
      o.shipment?.codAmount, o.shipment?.courierCharge, o.shipment ? (o.shipment.codRemitted ? "Yes" : "No") : "",
      pk(o.shipment?.deliveredAt), pk(o.shipment?.returnedAt),
    ]),
  );
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`orders-${status?.toLowerCase() ?? "all"}-${date}.csv`, csv);
}
