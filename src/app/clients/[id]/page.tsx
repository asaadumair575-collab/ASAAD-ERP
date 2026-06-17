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
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="text-sm text-gray-500">{client.city}</p>
          {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
          {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
          {client.notes && <p className="text-sm text-gray-500 mt-1">{client.notes}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clients/${client.id}/edit`}
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-md"
          >
            Edit
          </Link>
          <form action={deleteClientBound}>
            <button
              type="submit"
              className="text-sm border border-red-300 text-red-600 px-3 py-1.5 rounded-md"
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
          highlight={totalProfit >= 0 ? "green" : "red"}
        />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Add Order</h2>
        <form
          action={createOrderForClient}
          className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-lg p-4"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input
              type="text"
              name="description"
              placeholder="e.g. 50kg rice"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Purchase Amount</label>
            <input
              type="number"
              step="0.01"
              name="purchaseAmount"
              required
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sale Amount</label>
            <input
              type="number"
              step="0.01"
              name="saleAmount"
              required
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32"
            />
          </div>
          <button
            type="submit"
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md"
          >
            Add
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Order History</h2>
        {client.orders.length === 0 ? (
          <p className="text-gray-500 text-sm">No orders yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Purchase</th>
                <th className="py-2 pr-4">Sale</th>
                <th className="py-2 pr-4">Profit</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {client.orders.map((o) => {
                const deleteOrderBound = deleteOrder.bind(null, o.id, client.id);
                const profit = o.saleAmount - o.purchaseAmount;
                return (
                  <tr key={o.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      {o.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-2 pr-4">{o.description ?? "-"}</td>
                    <td className="py-2 pr-4">{o.purchaseAmount.toLocaleString()}</td>
                    <td className="py-2 pr-4">{o.saleAmount.toLocaleString()}</td>
                    <td
                      className={`py-2 pr-4 ${
                        profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {profit.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <form action={deleteOrderBound}>
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:underline"
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
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "green" | "red";
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-xl font-semibold mt-1 ${
          highlight === "green"
            ? "text-green-600"
            : highlight === "red"
              ? "text-red-600"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
