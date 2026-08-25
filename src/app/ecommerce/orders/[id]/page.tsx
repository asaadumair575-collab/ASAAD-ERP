import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  const order = await prisma.ecomOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) notFound();

  const orderLabel = order.notes?.replace("Shopify Order ", "") ?? `#${order.id}`;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/ecommerce/orders" className="text-sm text-gray-400 hover:text-black">← Confirm Orders</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{orderLabel}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {order.returned ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-600 border border-red-200">Returned</span>
          ) : order.status === "PAID" ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200">Delivered</span>
          ) : order.status === "PARTIAL" ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Partial</span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">Confirmed</span>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1.5">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Customer</p>
        <p className="text-base font-semibold">{order.customerName}</p>
        {order.phone && <p className="text-sm text-gray-500">{order.phone}</p>}
        {order.city && <p className="text-sm text-gray-500">{order.city}</p>}
        {order.address && <p className="text-sm text-gray-500">{order.address}</p>}
        {order.shopifyOrderId && <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-1.5 mt-1">Shopify: {order.shopifyOrderId}</p>}
        {order.trackingNumber && <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-1.5">Tracking: {order.trackingNumber}</p>}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Items</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
              <th className="py-2 px-5">Item</th>
              <th className="py-2 px-5 text-right">Qty</th>
              <th className="py-2 px-5 text-right">Rate</th>
              <th className="py-2 px-5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-5 font-medium">{item.description}</td>
                <td className="py-3 px-5 text-right tabular-nums text-gray-600">{item.quantity}</td>
                <td className="py-3 px-5 text-right tabular-nums text-gray-500">Rs {fmt(item.rate)}</td>
                <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(item.quantity * item.rate)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="py-3 px-5" colSpan={3}>Total</td>
              <td className="py-3 px-5 text-right tabular-nums">Rs {fmt(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
