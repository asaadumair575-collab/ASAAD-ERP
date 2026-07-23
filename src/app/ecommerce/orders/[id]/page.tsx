import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteEcomOrder, updateEcomOrderCosts, recordEcomPayment, deleteEcomPayment } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import EcomCostsForm from "@/components/EcomCostsForm";
import EcomPaymentSection from "@/components/EcomPaymentSection";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

const BALL_COST_PER_DOZ = 1450;
const PACKAGING_COST = 15;

export default async function EcomOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  const me = await getSessionUser();
  const isAdmin = me?.isAdmin ?? false;

  const order = await prisma.ecomOrder.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { orderBy: { date: "asc" } } },
  });
  if (!order) notFound();

  const received = order.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, order.totalAmount - received);
  const dozens = order.items.reduce((s, i) => s + i.quantity, 0);
  const ballCost = dozens * BALL_COST_PER_DOZ;
  const grossProfit = order.totalAmount - ballCost - PACKAGING_COST - order.shippingCost - order.returnCost;

  const updateCostsBound = updateEcomOrderCosts.bind(null, order.id);
  const recordPaymentBound = recordEcomPayment.bind(null, order.id);
  const deleteOrderBound = deleteEcomOrder.bind(null, order.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/ecommerce/orders" className="text-sm text-gray-400 hover:text-black">← Ecommerce Orders</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">E-{String(order.id).padStart(3, "0")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.date.toISOString().slice(0, 10)}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full mt-1 ${order.status === "PAID" ? "bg-green-100 text-green-700" : order.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
          {order.status === "PAID" ? "Paid" : order.status === "PARTIAL" ? "Partial" : "Pending"}
        </span>
      </div>

      {/* Customer */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Customer</p>
        <p className="text-base font-semibold">{order.customerName}</p>
        {(order.phone || order.city) && <p className="text-sm text-gray-500 mt-0.5">{[order.phone, order.city].filter(Boolean).join(" · ")}</p>}
        {order.notes && <p className="text-xs text-gray-400 mt-2 bg-gray-50 rounded-lg px-3 py-2">{order.notes}</p>}
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
              <th className="py-2 px-5 text-right">Qty (doz)</th>
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

      {/* Profit preview */}
      <div className={`rounded-2xl p-5 shadow-sm border ${grossProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Profit Preview</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Revenue</span><span className="font-medium">Rs {fmt(order.totalAmount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Ball Cost ({dozens} doz × 1,450)</span><span className="font-medium text-gray-600">− Rs {fmt(ballCost)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Packaging (fixed)</span><span className="font-medium text-gray-600">− Rs 15</span></div>
          {order.shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className="font-medium text-gray-600">− Rs {fmt(order.shippingCost)}</span></div>}
          {order.returnCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Return Cost</span><span className="font-medium text-gray-600">− Rs {fmt(order.returnCost)}</span></div>}
          <div className={`flex justify-between border-t pt-1.5 mt-1 font-bold text-base ${grossProfit >= 0 ? "border-green-200 text-green-700" : "border-red-200 text-red-600"}`}>
            <span>Gross Profit</span>
            <span>Rs {fmt(grossProfit)}</span>
          </div>
        </div>
      </div>

      {/* Costs form */}
      <EcomCostsForm
        action={updateCostsBound}
        shippingCost={order.shippingCost}
        returnCost={order.returnCost}
      />

      {/* Payment summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-lg font-semibold">Rs {fmt(order.totalAmount)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Received</p>
          <p className="text-lg font-semibold text-green-700">Rs {fmt(received)}</p>
        </div>
        <div className={`rounded-2xl p-4 shadow-sm text-center ${balance > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p className={`text-lg font-semibold ${balance > 0 ? "text-orange-600" : "text-green-700"}`}>{balance > 0 ? `Rs ${fmt(balance)}` : "✓ Paid"}</p>
        </div>
      </div>

      {/* Payment section */}
      <EcomPaymentSection
        orderId={order.id}
        balance={balance}
        payments={order.payments.map((p) => ({ id: p.id, amount: p.amount, note: p.note, date: p.date.toISOString() }))}
        recordAction={recordPaymentBound}
        deleteAction={deleteEcomPayment}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <div className="pt-2">
          <form action={deleteOrderBound}>
            <button type="submit" className="w-full border border-red-200 text-red-500 text-sm font-medium py-2.5 rounded-xl hover:bg-red-50 transition-colors">
              Delete Order
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
