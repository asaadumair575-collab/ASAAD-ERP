import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/businessProfile";
import { notFound } from "next/navigation";
import InvoiceShare from "@/components/InvoiceShare";
import {
  recordPayment,
  cancelOrder,
  confirmOrder,
  deleteOrderItem,
  updateOrderItem,
  deletePayment,
} from "@/lib/actions";
import OrderItemRow from "@/components/OrderItemRow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return { title: `INV-${orderId.padStart(4, "0")}` };
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string; orderId: string }>;
}) {
  const { id, orderId } = await params;
  const clientId = parseInt(id, 10);
  const orderIdNum = parseInt(orderId, 10);

  const order = await prisma.order.findUnique({
    where: { id: orderIdNum },
    include: { items: true, client: true, payments: { orderBy: { date: "asc" } } },
  });

  if (!order || order.clientId !== clientId) notFound();

  const profile = await getBusinessProfile();
  const invoiceNumber = `INV-${String(order.id).padStart(4, "0")}`;
  const paidSoFar = order.payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = order.saleAmount - paidSoFar;
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal = round2(order.items.reduce((s, i) => s + i.quantity * i.rate, 0));
  const taxAmount = round2((subtotal - order.discount) * (order.taxPercent / 100));
  const formatCurrency = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedDate = order.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const message = `Invoice ${invoiceNumber}\nDate: ${order.date
    .toISOString()
    .slice(0, 10)}\nTotal: ${order.saleAmount.toLocaleString()}`;

  const recordPaymentBound = recordPayment.bind(null, order.id, clientId);
  const cancelOrderBound = cancelOrder.bind(null, order.id, clientId);
  const confirmOrderBound = confirmOrder.bind(null, order.id, clientId);
  const deletePaymentBound = deletePayment.bind(null, order.id, clientId);

  return (
    <div className="max-w-2xl space-y-8 print:max-w-none print:space-y-0 print:min-h-[273mm] print:flex print:flex-col">
      <InvoiceShare
        message={message}
        pdfHref={`/clients/${clientId}/orders/${order.id}/pdf`}
        saleAmount={order.saleAmount}
        paidSoFar={paidSoFar}
        payments={order.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          date: p.date.toISOString(),
          method: p.method,
          note: p.note,
          screenshot: p.screenshot,
        }))}
        confirmed={order.confirmed}
        confirmOrderAction={confirmOrderBound}
        recordPaymentAction={recordPaymentBound}
        deletePaymentAction={deletePaymentBound}
        cancelOrderAction={cancelOrderBound}
      />

      <div className="border border-gray-200 rounded-2xl p-8 space-y-8 print:border-0 print:rounded-none print:p-0 print:space-y-16 print:flex print:flex-1 print:flex-col">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {profile?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo}
                alt={profile.name}
                className="h-20 w-20 rounded-lg object-cover print:h-32 print:w-32"
              />
            )}
            <div>
              <h1 className="text-lg font-semibold tracking-tight print:text-2xl">
                {profile?.name ?? "Your Business"}
              </h1>
              {profile?.address && (
                <p className="text-sm text-gray-500 mt-1 print:text-base print:mt-2">{profile.address}</p>
              )}
              {profile?.phone && (
                <p className="text-sm text-gray-500 print:text-base">{profile.phone}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight print:text-6xl">INVOICE</p>
            <p className="text-sm text-gray-500 print:text-lg print:mt-2"># {invoiceNumber}</p>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-base">
              Bill To
            </p>
            <p className="font-medium print:text-xl">
              {order.client.name}
              {order.client.businessName ? ` (${order.client.businessName})` : ""}
            </p>
            <p className="text-sm text-gray-500 print:text-lg">{order.client.city}</p>
          </div>
          <div className="space-y-1 text-right print:space-y-3">
            <div className="flex justify-between gap-6 text-sm print:text-lg">
              <span className="text-gray-500">Date:</span>
              <span>{formattedDate}</span>
            </div>
            {order.paymentTerms && (
              <div className="flex justify-between gap-6 text-sm print:text-lg">
                <span className="text-gray-500">Payment Terms:</span>
                <span>{order.paymentTerms}</span>
              </div>
            )}
            <div className="flex justify-between gap-6 text-sm bg-gray-50 px-2 py-1 rounded-lg print:text-lg print:px-4 print:py-3">
              <span className="text-gray-500 font-medium">Balance Due:</span>
              <span className="font-semibold">{formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>

        <table className="w-full text-sm print:text-lg">
          <thead>
            <tr className="text-left bg-gray-900 text-white text-xs uppercase tracking-wide print:text-base">
              <th className="py-2 px-3 font-medium rounded-l-lg print:py-4 print:px-5">Item</th>
              <th className="py-2 px-3 font-medium text-right print:py-4 print:px-5">Quantity</th>
              <th className="py-2 px-3 font-medium text-right print:py-4 print:px-5">Rate</th>
              <th className="py-2 px-3 font-medium text-right rounded-r-lg print:py-4 print:px-5">Amount</th>
              <th className="py-2 px-3 print:hidden"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => {
              const deleteItemBound = deleteOrderItem.bind(
                null,
                item.id,
                order.id,
                clientId
              );
              const updateItemBound = updateOrderItem.bind(
                null,
                item.id,
                order.id,
                clientId
              );
              return (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  showRemove={order.items.length > 1}
                  updateAction={updateItemBound}
                  deleteAction={deleteItemBound}
                />
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56 space-y-1 print:w-80 print:space-y-3">
            <div className="flex justify-between text-sm print:text-lg">
              <span className="text-gray-500">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm print:text-lg">
                <span className="text-gray-500">Discount:</span>
                <span>{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm print:text-lg">
              <span className="text-gray-500">Tax ({order.taxPercent}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-200 print:text-2xl print:pt-3">
              <span className="text-gray-500 font-medium">Total:</span>
              <span className="font-semibold">
                {formatCurrency(order.saleAmount)}
              </span>
            </div>
          </div>
        </div>

        {(order.notes || order.terms) && (
          <div className="space-y-4 pt-2 border-t border-gray-200 print:space-y-8 print:pt-6">
            {order.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-base">
                  Notes:
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-line print:text-lg">
                  {order.notes}
                </p>
              </div>
            )}
            {order.terms && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-base">
                  Terms:
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-line print:text-lg">
                  {order.terms}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
