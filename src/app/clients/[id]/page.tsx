import { prisma } from "@/lib/prisma";
import { createOrder, deleteOrder, deleteClient } from "@/lib/actions";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = parseInt(id, 10);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { orders: { orderBy: { date: "desc" } } },
  });

  if (!client) notFound();

  const totalSale = client.orders.reduce((s, o) => s + o.saleAmount, 0);
  const totalPurchase = client.orders.reduce((s, o) => s + o.purchaseAmount, 0);
  const totalProfit = totalSale - totalPurchase;

  const createOrderForClient = createOrder.bind(null, clientId);
  const deleteClientBound = deleteClient.bind(null, clientId);

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {client.name}
          </h1>
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

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Orders" value={client.orders.length} />
        <StatCard label="Total Spent" value={totalSale.toLocaleString()} />
        <StatCard
          label="Profit"
          value={totalProfit.toLocaleString()}
          dark
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Add Order</h2>
        <form
          action={createOrderForClient}
          className="flex flex-wrap gap-3 items-end bg-gray-50 border border-gray-200 rounded-2xl p-5"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1.5">
              Description
            </label>
            <input
              type="text"
              name="description"
              placeholder="e.g. 50kg rice"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Purchase Amount
            </label>
            <input
              type="number"
              step="0.01"
              name="purchaseAmount"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Sale Amount
            </label>
            <input
              type="number"
              step="0.01"
              name="saleAmount"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <button
            type="submit"
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Add
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Order History</h2>
        {client.orders.length === 0 ? (
          <div className="border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm">No orders yet.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="py-3 px-5 font-medium">Date</th>
                  <th className="py-3 px-5 font-medium">Description</th>
                  <th className="py-3 px-5 font-medium">Purchase</th>
                  <th className="py-3 px-5 font-medium">Sale</th>
                  <th className="py-3 px-5 font-medium">Profit</th>
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
                  const profit = o.saleAmount - o.purchaseAmount;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-5 text-gray-600">
                        {o.date.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 px-5">{o.description ?? "-"}</td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.purchaseAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.saleAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 font-medium">
                        {profit.toLocaleString()}
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
