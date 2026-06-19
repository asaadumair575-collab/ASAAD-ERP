import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import InvoiceShare from "@/components/InvoiceShare";
import { recordPayment, cancelOrder, confirmOrder } from "@/lib/actions";

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

  const profile = await prisma.businessProfile.findFirst();
  const invoiceNumber = `INV-${String(order.id).padStart(4, "0")}`;
  const paidSoFar = order.payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = order.saleAmount - paidSoFar;
  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount = (subtotal - order.discount) * (order.taxPercent / 100);

  const message = `Invoice ${invoiceNumber}\nDate: ${order.date
    .toISOString()
    .slice(0, 10)}\nTotal: ${order.saleAmount.toLocaleString()}`;

  const recordPaymentBound = recordPayment.bind(null, order.id, clientId);
  const cancelOrderBound = cancelOrder.bind(null, order.id, clientId);
  const confirmOrderBound = confirmOrder.bind(null, order.id, clientId);

  return (
    <div className="max-w-2xl space-y-8 print:max-w-none print:space-y-0">
      <InvoiceShare
        message={message}
        saleAmount={order.saleAmount}
        paidSoFar={paidSoFar}
        payments={order.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          date: p.date.toISOString(),
          screenshot: p.screenshot,
        }))}
        confirmed={order.confirmed}
        confirmOrderAction={confirmOrderBound}
        recordPaymentAction={recordPaymentBound}
        cancelOrderAction={cancelOrderBound}
      />

      <div className="border border-gray-200 rounded-2xl p-8 space-y-8 print:border-0 print:rounded-none print:p-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {profile?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo}
                alt={profile.name}
                className="h-16 w-16 rounded-full object-cover border border-gray-200"
              />
            )}
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                {profile?.name ?? "Your Business"}
              </h1>
              {profile?.address && (
                <p className="text-sm text-gray-500 mt-1">{profile.address}</p>
              )}
              {profile?.phone && (
                <p className="text-sm text-gray-500">{profile.phone}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight">INVOICE</p>
            <p className="text-sm text-gray-500"># {invoiceNumber}</p>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Bill To
            </p>
            <p className="font-medium">
              {order.client.name}
              {order.client.businessName ? ` (${order.client.businessName})` : ""}
            </p>
            <p className="text-sm text-gray-500">{order.client.city}</p>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex justify-between gap-6 text-sm">
              <span className="text-gray-500">Date:</span>
              <span>{order.date.toISOString().slice(0, 10)}</span>
            </div>
            {order.paymentTerms && (
              <div className="flex justify-between gap-6 text-sm">
                <span className="text-gray-500">Payment Terms:</span>
                <span>{order.paymentTerms}</span>
              </div>
            )}
            <div className="flex justify-between gap-6 text-sm bg-gray-50 px-2 py-1 rounded-lg">
              <span className="text-gray-500 font-medium">Balance Due:</span>
              <span className="font-semibold">
                {balanceDue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-900 text-white text-xs uppercase tracking-wide">
              <th className="py-2 px-3 font-medium rounded-l-lg">Item</th>
              <th className="py-2 px-3 font-medium text-right">Quantity</th>
              <th className="py-2 px-3 font-medium text-right">Rate</th>
              <th className="py-2 px-3 font-medium text-right rounded-r-lg">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 px-3">{item.description}</td>
                <td className="py-2 px-3 text-right">{item.quantity}</td>
                <td className="py-2 px-3 text-right">
                  {item.rate.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right">
                  {(item.quantity * item.rate).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span>{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount:</span>
                <span>{order.discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax ({order.taxPercent}%):</span>
              <span>{taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
              <span className="text-gray-500 font-medium">Total:</span>
              <span className="font-semibold">
                {order.saleAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {(order.notes || order.terms) && (
          <div className="space-y-4 pt-2 border-t border-gray-200">
            {order.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Notes:
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {order.notes}
                </p>
              </div>
            )}
            {order.terms && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Terms:
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
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
