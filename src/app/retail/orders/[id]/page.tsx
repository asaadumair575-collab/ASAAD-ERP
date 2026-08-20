import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { recordRetailPayment, deleteRetailPayment, deleteRetailOrder, setRetailDispatched, updateRetailCourierCharge, setRetailTrackingNumber } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { parsePermissions, canDoSub } from "@/lib/permissions";
import RetailPaymentSection from "@/components/RetailPaymentSection";
import RetailDeleteButton from "@/components/RetailDeleteButton";
import ReceiptCopyButton from "@/components/ReceiptCopyButton";
import TrackingNumberForm from "@/components/TrackingNumberForm";

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
  const isAdmin = me?.isAdmin ?? false;
  const perms = parsePermissions(me?.permissions ?? {});
  const hasSub = perms.sub && Object.keys(perms.sub).length > 0;
  const canRecordPayment = isAdmin || (!hasSub || perms.sub?.["retail_record_payment"] === true);
  const canSetCourier    = isAdmin || (!hasSub || perms.sub?.["retail_set_courier"] === true);
  const canSeeCharges    = isAdmin || (!hasSub || perms.sub?.["retail_see_charges"] === true);

  const { id } = await params;
  const { receipt } = await searchParams;
  const orderId = parseInt(id, 10);

  const [order, profile] = await Promise.all([
    prisma.retailOrder.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { date: "asc" } } },
    }),
    prisma.businessProfile.findFirst(),
  ]);

  if (!order) notFound();

  const slipNo = `R-${String(order.id).padStart(3, "0")}`;
  const received = order.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, order.totalAmount - received);

  const recordPaymentBound = recordRetailPayment.bind(null, order.id);
  const deleteOrderBound = deleteRetailOrder.bind(null, order.id);
  const toggleDispatchBound = setRetailDispatched.bind(null, order.id, !order.dispatched);
  const updateCourierBound    = updateRetailCourierCharge.bind(null, order.id);
  const setTrackingBound      = setRetailTrackingNumber.bind(null, order.id);


  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/retail/orders" className="text-sm text-gray-400 hover:text-black">← Retail</Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            R-{String(order.id).padStart(3, "0")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.date.toISOString().slice(0, 10)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            order.status === "PAID" ? "bg-green-100 text-green-700" :

            order.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
            "bg-gray-100 text-gray-500"
          }`}>
            {order.status === "PAID" ? "Delivered" : order.status === "PARTIAL" ? "Partial" : "Pending"}
          </span>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            order.dispatched ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-600"
          }`}>
            {order.dispatched ? "Dispatched" : "Not Dispatched"}
          </span>
        </div>
      </div>


      {/* Receipt box — always visible */}
      <div className="space-y-3">
        <div id="retail-receipt" className="relative bg-white border-2 border-black rounded-2xl p-6 shadow-sm space-y-4 overflow-hidden">
          {/* Security watermark */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                top: `${i * 70 - 30}px`,
                left: "-120px",
                right: "-120px",
                transform: "rotate(-30deg)",
                whiteSpace: "nowrap",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.25em",
                color: "rgba(0,0,0,0.06)",
                userSelect: "none",
              }}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <span key={j}>{profile?.name ?? "ASAAD ERP"} &nbsp;•&nbsp; VERIFIED &nbsp;•&nbsp; {slipNo} &nbsp;•&nbsp; </span>
                ))}
              </div>
            ))}
          </div>

          <div className="text-center border-b border-dashed border-gray-300 pb-4">
            {profile?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo} alt={profile.name} className="h-12 mx-auto mb-2 object-contain" />
            ) : (
              <div className="w-12 h-12 mx-auto mb-2 bg-black rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-black">{(profile?.name ?? "A").charAt(0)}</span>
              </div>
            )}
            <p className="text-base font-black tracking-tight text-gray-900">{profile?.name ?? "ASAAD ERP"}</p>
            <p className="text-[10px] font-semibold text-gray-600 mt-0.5">03351005301</p>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-2 mb-1">Payment Receipt</p>
            <p className="text-2xl font-bold tracking-tight">{slipNo}</p>
            <p className="text-sm text-gray-500 mt-0.5">{order.date.toISOString().slice(0, 10)}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 bg-green-50 border border-green-300 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                ✓ Advance Received
              </span>
              <span className="inline-flex items-center gap-1 bg-green-50 border border-green-300 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                ✓ Order Confirmed
              </span>
            </div>
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
              <span className="text-gray-500">Amount Received</span>
              <span className="font-semibold text-green-700 tabular-nums">Rs {fmt(received)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5 mt-1.5">
              <span>Balance Due</span>
              <span className={balance > 0 ? "text-orange-600" : "text-green-700"}>
                {balance > 0 ? `Rs ${fmt(balance)}` : "✓ Fully Paid"}
              </span>
            </div>
          </div>


        </div>
        <div className="flex justify-end">
          <ReceiptCopyButton targetId="retail-receipt" />
        </div>
      </div>

      {/* Customer card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Customer</p>
        {order.retailCustomerId ? (
          <Link href={`/retail/customers/${order.retailCustomerId}`} className="text-base font-semibold hover:underline">
            {order.customerName}
          </Link>
        ) : (
          <p className="text-base font-semibold">{order.customerName}</p>
        )}
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

      {/* Dispatch */}
      <div className={`rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4 ${
        order.dispatched ? "bg-blue-50 border border-blue-200" : "bg-orange-50 border border-orange-200"
      }`}>
        <div>
          <p className={`text-sm font-semibold ${order.dispatched ? "text-blue-800" : "text-orange-800"}`}>
            {order.dispatched ? "Order Dispatched" : "Not Yet Dispatched"}
          </p>
          {order.dispatchedAt && (
            <p className="text-xs text-blue-600 mt-0.5">
              {order.dispatchedAt.toISOString().slice(0, 10)}
            </p>
          )}
        </div>
        {order.dispatched ? null : isAdmin && !order.trackingNumber ? (
          <span className="text-xs text-orange-700 font-medium">⚠ Add tracking number first</span>
        ) : !order.dispatched ? (
          <form action={toggleDispatchBound}>
            <button type="submit" className="text-sm font-medium px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors">
              Mark as Dispatched
            </button>
          </form>
        ) : null}
      </div>

      {/* PostEx Tracking Number */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">PostEx Tracking Number</p>
          {order.trackingNumber && (
            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">{order.trackingNumber}</span>
          )}
        </div>
        <TrackingNumberForm
          defaultValue={order.trackingNumber ?? ""}
          isAdmin={isAdmin}
          action={setTrackingBound}
        />
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
          channel: p.channel,
        }))}
        recordAction={recordPaymentBound}
        deleteAction={deleteRetailPayment}
        updateCourierAction={updateCourierBound}
        isAdmin={isAdmin}
        canRecordPayment={canRecordPayment}
        canSetCourier={canSetCourier}
        canSeeCharges={canSeeCharges}
      />

      {/* Delete order — admin only */}
      {isAdmin && (
        <div className="pt-2">
          <RetailDeleteButton action={deleteOrderBound} />
        </div>
      )}
    </div>
  );
}
