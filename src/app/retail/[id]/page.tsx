import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { parsePermissions, canDoSub } from "@/lib/permissions";
import { recordRetailPayment, deleteRetailPayment, deleteRetailOrder, updateRetailCourierCharge } from "@/lib/actions";
import RetailPaymentSection from "@/components/RetailPaymentSection";
import RetailDeleteButton from "@/components/RetailDeleteButton";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ receipt?: string }>;
}) {
  const me = await getSessionUser();
  const { id } = await params;
  const { receipt } = await searchParams;
  const orderId = parseInt(id, 10);

  const order = await prisma.retailOrder.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { orderBy: { date: "asc" } } },
  });

  if (!order) notFound();

  const received = order.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, order.totalAmount - received);

  const perms = parsePermissions(me?.permissions ?? {});
  const isAdmin = me?.isAdmin ?? false;
  const hasSub = perms.sub && Object.keys(perms.sub).length > 0;
  // If no sub-permissions configured at all, default to true (backward compat).
  // Otherwise check the specific permission.
  const canRecordPayment = isAdmin || (!hasSub ? true : perms.sub?.["retail_record_payment"] === true);
  const canSetCourier    = isAdmin || (!hasSub ? true : perms.sub?.["retail_set_courier"] === true);
  const canSeeCharges    = isAdmin || (!hasSub ? true : perms.sub?.["retail_see_charges"] === true);

  const recordPaymentBound = recordRetailPayment.bind(null, order.id);
  const updateCourierBound = updateRetailCourierCharge.bind(null, order.id);
  const deleteOrderBound = deleteRetailOrder.bind(null, order.id);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/retail" className="text-sm text-gray-400 hover:text-black">← Retail</Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            R-{String(order.id).padStart(3, "0")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.date.toISOString().slice(0, 10)}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full mt-1 ${
          order.status === "PAID" ? "bg-green-100 text-green-700" :
          order.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-500"
        }`}>
          {order.status}
        </span>
      </div>

      {/* Receipt box — shown after recording payment */}
      {receipt && (
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm space-y-4">
          <div className="text-center border-b border-dashed border-gray-300 pb-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Payment Receipt</p>
            <p className="text-2xl font-bold tracking-tight">R-{String(order.id).padStart(3, "0")}</p>
            <p className="text-sm text-gray-500 mt-0.5">{order.date.toISOString().slice(0, 10)}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-0.5">Customer</p>
            <p className="font-semibold">{order.customerName}</p>
            {(order.phone || order.city) && (
              <p className="text-sm text-gray-500">{[order.phone, order.city].filter(Boolean).join(" · ")}</p>
            )}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.description} <span className="text-gray-400">×{item.quantity} doz</span></span>
                <span className="font-medium tabular-nums">Rs {fmt(item.quantity * item.rate)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-semibold tabular-nums">Rs {fmt(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Advance Received</span>
              <span className="font-semibold text-green-700 tabular-nums">Rs {fmt(order.deliveryCharge ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5 mt-1.5">
              <span>Balance Due</span>
              <span className={balance > 0 ? "text-orange-600" : "text-green-700"}>
                {balance > 0 ? `Rs ${fmt(balance)}` : "✓ Fully Paid"}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Customer card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Customer</p>
        <p className="text-base font-semibold">{order.customerName}</p>
        {(order.phone || order.city) && (
          <p className="text-sm text-gray-500 mt-0.5">{[order.phone, order.city].filter(Boolean).join(" · ")}</p>
        )}
        {order.notes && (
          <p className="text-xs text-gray-400 mt-2 bg-gray-50 rounded-lg px-3 py-2">{order.notes}</p>
        )}
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
          <p className="text-xs text-gray-500 mb-1">Balance Due</p>
          <p className={`text-lg font-semibold ${balance > 0 ? "text-orange-600" : "text-green-700"}`}>
            {balance > 0 ? `Rs ${fmt(balance)}` : "✓ Paid"}
          </p>
        </div>
      </div>

      {/* Payment section (record + history) */}
      <RetailPaymentSection
        orderId={order.id}
        balance={balance}
        courierCharge={order.courierCharge}
        payments={order.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          note: p.note,
          date: p.date.toISOString(),
          screenshot: p.screenshot,
        }))}
        recordAction={recordPaymentBound}
        deleteAction={deleteRetailPayment}
        updateCourierAction={updateCourierBound}
        canRecordPayment={canRecordPayment}
        canSetCourier={canSetCourier}
        canSeeCharges={canSeeCharges}
        isAdmin={isAdmin}
      />

      {/* Receipt & Delete */}
      <div className="pt-2 flex items-center justify-between">
        <Link
          href={`/retail/${order.id}?receipt=1`}
          className="text-xs text-gray-500 hover:text-black underline underline-offset-2"
        >
          Open Receipt
        </Link>
        {isAdmin && <RetailDeleteButton action={deleteOrderBound} />}
      </div>
    </div>
  );
}
