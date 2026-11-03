import { ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import OrderActions from "@/components/OrderActions";
import { Badge, Card, CardHeader, Td, Th, Table, btn, inputCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { COURIER_INFO, courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { ORDER_STATUS, SHIPMENT_STATUS, fmtDateTime, money, whatsappLink } from "@/lib/format";
import { connectedCouriers } from "@/lib/shipping";
import { addOrderNote, updateOrderDetails } from "../../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const order = await db.order.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { items: true, shipment: true, activity: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();

  const [history, couriers] = await Promise.all([
    order.phone
      ? db.order.groupBy({ by: ["status"], where: { tenantId: user.tenantId, phone: order.phone, id: { not: order.id } }, _count: true })
      : Promise.resolve([]),
    connectedCouriers(user.tenantId, user.tenant.isDemo),
  ]);
  const past = history.reduce((s, h) => s + h._count, 0);
  const pastReturns = history.find((h) => h.status === "RETURNED")?._count ?? 0;
  const pastDelivered = history.find((h) => h.status === "DELIVERED")?._count ?? 0;
  const s = order.shipment;
  const wa = whatsappLink(
    order.phone,
    `Assalam o Alaikum ${order.customerName}, thank you for your order ${order.number} from ${user.tenant.name}.\nTotal: ${money(order.total)}${order.paymentMethod === "COD" ? " (cash on delivery)" : ""}\nPlease reply YES to confirm your order.`,
  );

  return (
    <div className="space-y-6">
      <Link href="/app/orders" className="text-sm text-gray-500 hover:text-gray-900">← Orders</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">Order {order.number}</h1>
            <Badge className={ORDER_STATUS[order.status].cls}>{ORDER_STATUS[order.status].label}</Badge>
            <Badge>{order.source === "SHOPIFY" ? "Shopify" : "Manual"}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{fmtDateTime(order.placedAt)} · {order.paymentMethod === "COD" ? "Cash on delivery" : "Paid online"}</p>
        </div>
        <OrderActions orderId={order.id} status={order.status} shipmentId={s?.id ?? null} couriers={couriers.map((c) => ({ value: c, label: courierName(c) }))} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Items" />
            <Table>
              <thead><tr><Th>Product</Th><Th>SKU</Th><Th right>Qty</Th><Th right>Price</Th><Th right>Total</Th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <Td>{i.title}</Td>
                    <Td className="text-gray-500 font-mono text-xs">{i.sku ?? "—"}</Td>
                    <Td right>{i.qty}</Td>
                    <Td right>{money(i.price)}</Td>
                    <Td right>{money(i.qty * i.price)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="p-4 text-sm space-y-1 ml-auto max-w-xs">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="tabular-nums">{money(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span className="tabular-nums">− {money(order.discount)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span className="tabular-nums">{money(order.shippingFee)}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t border-gray-100"><span>Total</span><span className="tabular-nums">{money(order.total)}</span></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <form action={addOrderNote.bind(null, order.id)} className="p-4 flex gap-2 border-b border-gray-100">
              <input name="note" placeholder="Add a note (e.g. customer asked for evening delivery)" className={inputCls} />
              <button className={btn("secondary")}>Add</button>
            </form>
            <ol className="p-4 space-y-3">
              {order.activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="text-gray-900">{a.message}</p>
                  <p className="text-xs text-gray-500">{fmtDateTime(a.createdAt)}{a.by ? ` · ${a.by}` : ""}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Shipment" />
            <div className="p-4 text-sm space-y-2">
              {s ? (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Courier</span><span>{courierName(s.courier)}</span></div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">Tracking</span>
                    {s.courier === "DEMO" ? <span className="font-mono">{s.trackingNumber}</span> : (
                      <a href={COURIER_INFO[s.courier].trackUrl(s.trackingNumber)} target="_blank" rel="noreferrer" className="font-mono inline-flex items-center gap-1 hover:underline">{s.trackingNumber}<ExternalLink className="w-3 h-3" /></a>
                    )}
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge className={SHIPMENT_STATUS[s.status].cls}>{SHIPMENT_STATUS[s.status].label}</Badge></div>
                  {s.courierStatus && <div className="flex justify-between gap-2"><span className="text-gray-500">Courier says</span><span className="text-right">{s.courierStatus}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">COD amount</span><span className="tabular-nums">{money(s.codAmount)}</span></div>
                  {s.codAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">COD received</span><span>{s.codRemitted ? "Yes" : "Not yet"}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">Booked</span><span>{fmtDateTime(s.bookedAt)}</span></div>
                  {s.lastCheckedAt && <p className="text-xs text-gray-400 pt-1">Last checked {fmtDateTime(s.lastCheckedAt)}</p>}
                  {s.slipUrl && <a href={s.slipUrl} target="_blank" rel="noreferrer" className={`${btn("secondary", "sm")} mt-2`}>Print airway bill</a>}
                </>
              ) : (
                <p className="text-gray-500">Not booked yet.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Customer" action={wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>} />
            <div className="p-4 text-sm">
              {past > 0 ? (
                <p className={`mb-3 rounded-md px-3 py-2 ${pastReturns ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"}`}>
                  {past} earlier order{past > 1 ? "s" : ""} · {pastDelivered} delivered · {pastReturns} returned
                </p>
              ) : (
                <p className="mb-3 text-gray-500">First order from this customer.</p>
              )}
              <form action={updateOrderDetails.bind(null, order.id)} className="space-y-2">
                <input name="customerName" defaultValue={order.customerName} className={inputCls} aria-label="Name" />
                <input name="phone" defaultValue={order.phone ?? ""} placeholder="Phone" className={inputCls} aria-label="Phone" />
                <input name="city" defaultValue={order.city ?? ""} placeholder="City" className={inputCls} aria-label="City" />
                <textarea name="address" defaultValue={order.address ?? ""} placeholder="Address" rows={3} className={`${inputCls} h-auto py-2`} aria-label="Address" />
                {(order.status === "NEW" || order.status === "CONFIRMED") && <button className={btn("secondary", "sm")}>Save details</button>}
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
