import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import InvoiceShare from "@/components/InvoiceShare";

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
    include: { items: true, client: true },
  });

  if (!order || order.clientId !== clientId) notFound();

  const profile = await prisma.businessProfile.findFirst();
  const invoiceNumber = `INV-${String(order.id).padStart(4, "0")}`;

  const message = `Invoice ${invoiceNumber}\nDate: ${order.date
    .toISOString()
    .slice(0, 10)}\nTotal: ${order.saleAmount.toLocaleString()}`;

  return (
    <div className="max-w-2xl space-y-8">
      <InvoiceShare message={message} />

      <div className="border border-gray-200 rounded-2xl p-8 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile?.name ?? "Your Business"}
            </h1>
            {profile?.address && (
              <p className="text-sm text-gray-500 mt-1">{profile.address}</p>
            )}
            {profile?.phone && (
              <p className="text-sm text-gray-500">{profile.phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{invoiceNumber}</p>
            <p className="text-sm text-gray-500">
              {order.date.toISOString().slice(0, 10)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Bill To
          </p>
          <p className="font-medium">{order.client.name}</p>
          {order.client.businessName && (
            <p className="text-sm text-gray-600">
              {order.client.businessName}
            </p>
          )}
          <p className="text-sm text-gray-500">{order.client.city}</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Rate</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">
                  {item.rate.toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  {(item.quantity * item.rate).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-48 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold">
                {order.saleAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
