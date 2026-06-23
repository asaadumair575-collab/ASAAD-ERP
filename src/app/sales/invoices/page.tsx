import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteOrder } from "@/lib/actions";
import InvoiceTabs from "@/components/InvoiceTabs";

export default async function InvoicesPage() {
  const orders = await prisma.order.findMany({
    where: { confirmed: false },
    include: { client: true },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoicing</h1>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} draft invoice{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/sales/invoices/new"
          className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      <InvoiceTabs active="pending" />

      {orders.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No draft invoices.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Invoice</th>
                <th className="py-3 px-5 font-medium">Customer</th>
                <th className="py-3 px-5 font-medium">Date</th>
                <th className="py-3 px-5 font-medium">Amount</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => {
                const deleteOrderBound = deleteOrder.bind(null, o.id, o.clientId);
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5">
                      <Link
                        href={`/clients/${o.clientId}/orders/${o.id}`}
                        className="font-medium hover:underline"
                      >
                        INV-{String(o.id).padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-600">{o.client.name}</td>
                    <td className="py-3 px-5 text-gray-600">
                      {o.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {o.saleAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                        Draft
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
  );
}
