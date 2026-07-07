import { prisma } from "@/lib/prisma";
import Link from "next/link";
import InvoiceTabs from "@/components/InvoiceTabs";

export default async function AdvanceInvoicesPage() {
  const orders = await prisma.order.findMany({
    where: { confirmed: true, paymentStatus: "PARTIAL" },
    include: { client: true, payments: { orderBy: { date: "asc" } } },
    orderBy: { date: "desc" },
  });

  const totalOutstanding = orders.reduce((sum, o) => {
    const paid = o.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, o.saleAmount - paid);
  }, 0);

  const totalAdvanceReceived = orders.reduce((sum, o) => {
    return sum + o.payments.reduce((s, p) => s + p.amount, 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoicing</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} invoice{orders.length === 1 ? "" : "s"} with advance received
          </p>
        </div>
        <Link
          href="/sales/invoices/new"
          className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      <InvoiceTabs active="advance" advanceCount={orders.length} />

      {orders.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No invoices with advance payments.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="text-xs text-yellow-700 uppercase tracking-wide font-medium">Total Remaining</p>
              <p className="text-2xl font-semibold mt-1 text-yellow-900">{totalOutstanding.toLocaleString()}</p>
              <p className="text-xs text-yellow-600 mt-0.5">still to be collected</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Advance Received</p>
              <p className="text-2xl font-semibold mt-1">{totalAdvanceReceived.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">across {orders.length} invoice{orders.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <th className="py-3 px-5">Invoice</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Total</th>
                  <th className="py-3 px-5">Advance Paid</th>
                  <th className="py-3 px-5">Remaining</th>
                  <th className="py-3 px-5">Last Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const paid = o.payments.reduce((s, p) => s + p.amount, 0);
                  const remaining = Math.max(0, o.saleAmount - paid);
                  const lastPayment = o.payments[o.payments.length - 1];
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-5">
                        <Link
                          href={`/clients/${o.clientId}/orders/${o.id}`}
                          className="font-medium hover:underline"
                        >
                          INV-{String(o.id).padStart(4, "0")}
                        </Link>
                      </td>
                      <td className="py-3 px-5 text-gray-700 font-medium">{o.client.name}</td>
                      <td className="py-3 px-5 text-gray-500">
                        {o.date.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.saleAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {paid.toLocaleString()}
                        <span className="ml-1 text-xs text-gray-400">
                          ({Math.round((paid / o.saleAmount) * 100)}%)
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className="font-semibold text-orange-600">
                          {remaining.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-500 text-xs">
                        {lastPayment ? (
                          <span>
                            {lastPayment.date.toISOString().slice(0, 10)}
                            {lastPayment.note && (
                              <span className="ml-1.5 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {lastPayment.note}
                              </span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
