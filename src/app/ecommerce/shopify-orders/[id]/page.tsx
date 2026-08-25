import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import DraftStatusModal from "@/components/DraftStatusModal";
import ConfirmDraftButton from "@/components/ConfirmDraftButton";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  CALL_NOT_PICKED: { label: "Call Not Picked", color: "bg-yellow-100 text-yellow-700" },
  NUMBER_OFF:      { label: "Number Off",      color: "bg-orange-100 text-orange-700" },
  CANCELLED:       { label: "Cancelled",        color: "bg-red-100 text-red-600" },
  CONFIRMED:       { label: "Confirmed",        color: "bg-green-100 text-green-700" },
};

export default async function DraftOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.ecomOrder.findUnique({
    where: { id: parseInt(id, 10) },
    include: { items: true, statusLogs: { orderBy: { createdAt: "asc" } } },
  });
  if (!order || !order.draft) notFound();

  const label = order.notes?.replace("Shopify Order ", "") ?? `#${order.shopifyOrderId ?? order.id}`;
  const statusMeta = order.draftStatus ? STATUS_META[order.draftStatus] : null;
  const subtotal = order.items.reduce((s, i) => s + i.rate * i.quantity, 0);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/ecommerce/shopify-orders" className="text-sm text-gray-400 hover:text-black transition-colors">
            ← Draft Orders
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{label}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {order.date.toLocaleDateString("en-PK", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {statusMeta ? (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200">New</span>
          )}
          <ConfirmDraftButton id={order.id} />
        </div>
      </div>

      {/* Customer info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1.5">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Customer</p>
        <p className="text-base font-semibold text-gray-900">{order.customerName}</p>
        {order.phone && <p className="text-sm text-gray-500">{order.phone}</p>}
        {order.city && <p className="text-sm text-gray-500">{order.city}</p>}
        {order.address && <p className="text-sm text-gray-500">{order.address}</p>}
        {order.notes && (
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-1.5 mt-2">{order.notes}</p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Order Items</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
              <th className="py-2.5 px-5">Item</th>
              <th className="py-2.5 px-5 text-center">Qty</th>
              <th className="py-2.5 px-5 text-right">Rate</th>
              <th className="py-2.5 px-5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-5 text-gray-900">{item.description}</td>
                <td className="py-3 px-5 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 px-5 text-right text-gray-600">Rs {fmt(item.rate)}</td>
                <td className="py-3 px-5 text-right font-semibold text-gray-900">Rs {fmt(item.rate * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={3} className="py-3 px-5 text-right text-sm font-semibold text-gray-700">Total</td>
              <td className="py-3 px-5 text-right text-base font-bold text-gray-900">Rs {fmt(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</p>
          <p className="text-sm text-gray-500 mt-0.5">Click to update</p>
        </div>
        <DraftStatusModal id={order.id} initial={order.draftStatus ?? null} logs={order.statusLogs} />
      </div>

      {/* Status Timeline */}
      {order.statusLogs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-4">Status History</p>
          <ol className="relative border-l border-gray-200 space-y-4 ml-2">
            {order.statusLogs.map((log) => {
              const meta = STATUS_META[log.status];
              const d = log.createdAt;
              const dateStr = d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
              const timeStr = d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true });
              return (
                <li key={log.id} className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white bg-gray-300" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta?.color ?? "bg-gray-100 text-gray-500"}`}>
                      {meta?.label ?? log.status}
                    </span>
                    <span className="text-xs text-gray-400">{dateStr} · {timeStr}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
