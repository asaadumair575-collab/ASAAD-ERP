import { prisma } from "@/lib/prisma";
import Link from "next/link";
import InvoiceTabs from "@/components/InvoiceTabs";

export default async function PaidInvoicesPage() {
  const [orders, advanceCount] = await Promise.all([
    prisma.order.findMany({
      where: { confirmed: true, paymentStatus: "PAID" },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.order.count({ where: { confirmed: true, paymentStatus: "PARTIAL" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoicing</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} fully paid invoice{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/sales/invoices/new"
          className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      <InvoiceTabs active="paid" advanceCount={advanceCount} />

      {orders.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No fully paid invoices yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Invoice</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Amount</th>
                <th className="py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
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
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-black text-white">
                      Paid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
