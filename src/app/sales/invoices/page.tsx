import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteOrder } from "@/lib/actions";
import InvoiceTabs from "@/components/InvoiceTabs";
import DeleteButton from "@/components/DeleteButton";

export default async function InvoicesPage() {
  const [orders, advanceCount] = await Promise.all([
    prisma.order.findMany({
      where: { confirmed: false },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.order.count({ where: { confirmed: true, paymentStatus: "PARTIAL" } }),
  ]);

  const pendingAmount = orders.reduce((sum, o) => sum + o.saleAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoicing</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} draft invoice{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/sales/invoices/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      <div className="border border-amber-200 rounded-xl p-5 bg-amber-50 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Total Pending</p>
          <p className="text-2xl font-semibold tracking-tight mt-0.5 tabular-nums">
            {pendingAmount.toLocaleString()}
          </p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-amber-300">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <InvoiceTabs active="pending" advanceCount={advanceCount} />

      {orders.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No draft invoices.</p>
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
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => {
                const deleteOrderBound = deleteOrder.bind(null, o.id, o.clientId);
                return (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/clients/${o.clientId}/orders/${o.id}`} className="font-medium hover:underline">
                        INV-{String(o.id).padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{o.client.name}</td>
                    <td className="py-3 px-5 text-gray-500">{o.date.toISOString().slice(0, 10)}</td>
                    <td className="py-3 px-5 font-medium tabular-nums">{o.saleAmount.toLocaleString()}</td>
                    <td className="py-3 px-5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                        Draft
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <DeleteButton action={deleteOrderBound} message="This draft invoice will be permanently deleted." />
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
