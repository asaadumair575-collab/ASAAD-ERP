import { prisma } from "@/lib/prisma";
import { createOrder, deleteOrder, deleteClient } from "@/lib/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import OrderItemsForm from "@/components/OrderItemsForm";
import { averageMonthlyDzn, gradeForMonthlyDzn } from "@/lib/grade";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = parseInt(id, 10);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      orders: {
        orderBy: { date: "desc" },
        include: { items: true, payments: true },
      },
    },
  });

  if (!client) notFound();

  const paidOrders = client.orders.filter((o) => o.paymentStatus === "PAID");
  const totalReceived = client.orders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const monthlyDzn = averageMonthlyDzn(paidOrders);
  const grade = gradeForMonthlyDzn(monthlyDzn, paidOrders.length > 0);

  const createOrderForClient = createOrder.bind(null, clientId);
  const deleteClientBound = deleteClient.bind(null, clientId);

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${grade.badgeClass}`}
            >
              {grade.label}
            </span>
          </div>
          {client.businessName && (
            <p className="text-sm text-gray-600 mt-1">{client.businessName}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">{client.city}</p>
          <div className="text-sm text-gray-500 mt-2 space-y-0.5">
            {client.phone && <p>{client.phone}</p>}
            {client.address && <p>{client.address}</p>}
          </div>
          {client.notes && (
            <p className="text-sm text-gray-500 mt-2 max-w-md">
              {client.notes}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clients/${client.id}/edit`}
            className="text-sm font-medium border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
          <form action={deleteClientBound}>
            <button
              type="submit"
              className="text-sm font-medium border border-gray-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Orders" value={client.orders.length} />
        <StatCard label="Total Received" value={totalReceived.toLocaleString()} />
        <StatCard
          label="Avg Monthly Dzn"
          value={monthlyDzn.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Add Order</h2>
        <OrderItemsForm action={createOrderForClient} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Order History</h2>
        {client.orders.length === 0 ? (
          <div className="border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm">No orders yet.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="py-3 px-5 font-medium">Invoice</th>
                  <th className="py-3 px-5 font-medium">Date</th>
                  <th className="py-3 px-5 font-medium">Items</th>
                  <th className="py-3 px-5 font-medium">Purchase</th>
                  <th className="py-3 px-5 font-medium">Sale</th>
                  <th className="py-3 px-5 font-medium">Paid</th>
                  <th className="py-3 px-5 font-medium">Balance</th>
                  <th className="py-3 px-5 font-medium">Status</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {client.orders.map((o) => {
                  const deleteOrderBound = deleteOrder.bind(
                    null,
                    o.id,
                    client.id
                  );
                  const paid = o.payments.reduce((s, p) => s + p.amount, 0);
                  const balance = o.saleAmount - paid;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-5">
                        <Link
                          href={`/clients/${client.id}/orders/${o.id}`}
                          className="font-medium hover:underline"
                        >
                          INV-{String(o.id).padStart(4, "0")}
                        </Link>
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.date.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.items.length}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.purchaseAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.saleAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {paid.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {balance.toLocaleString()}
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            o.paymentStatus === "PAID"
                              ? "bg-black text-white"
                              : o.paymentStatus === "PARTIAL"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {o.paymentStatus === "PAID"
                            ? "Paid"
                            : o.paymentStatus === "PARTIAL"
                              ? "Partial"
                              : "Unpaid"}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <form action={deleteOrderBound}>
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  dark,
}: {
  label: string;
  value: string | number;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border ${
        dark
          ? "bg-black text-white border-black"
          : "bg-white text-black border-gray-200"
      }`}
    >
      <div className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </div>
      <div className="text-2xl font-semibold mt-2 tracking-tight">
        {value}
      </div>
    </div>
  );
}
