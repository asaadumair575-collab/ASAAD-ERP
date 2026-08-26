import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DateRangeFilter from "@/components/DateRangeFilter";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function WholesaleOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; dispatched?: string }>;
}) {
  const { q, from, to, dispatched: dispatchedFilter } = await searchParams;

  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const dispatchedWhere =
    dispatchedFilter === "yes" ? true :
    dispatchedFilter === "no"  ? false :
    undefined;

  const orders = await prisma.order.findMany({
    where: {
      confirmed: true,
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(dispatchedWhere !== undefined ? { dispatched: dispatchedWhere } : {}),
      ...(q
        ? {
            client: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            },
          }
        : {}),
    },
    include: { client: { select: { id: true, name: true, city: true } } },
    orderBy: { date: "desc" },
  });

  const totalOrders = orders.length;
  const pendingDispatch = orders.filter((o) => !o.dispatched).length;
  const dispatched = orders.filter((o) => o.dispatched).length;
  const totalValue = orders.reduce((s, o) => s + o.saleAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wholesale Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">All confirmed invoices and their dispatch status.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: totalOrders, color: "text-gray-800" },
          { label: "Pending Dispatch", value: pendingDispatch, color: "text-orange-600" },
          { label: "Dispatched", value: dispatched, color: "text-green-600" },
          { label: "Total Value", value: `Rs ${fmt(totalValue)}`, color: "text-gray-800" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search customer, city, phone..."
          className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
        />
        <DateRangeFilter from={from} to={to} />
        <select
          name="dispatched"
          defaultValue={dispatchedFilter ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All orders</option>
          <option value="no">Pending dispatch</option>
          <option value="yes">Dispatched</option>
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {(q || from || to || dispatchedFilter) && (
          <Link href="/sales/orders" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
        )}
      </form>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5 text-center">Payment</th>
                <th className="py-3 px-5 text-center">Dispatch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-5">
                    <Link
                      href={`/clients/${o.client.id}/orders/${o.id}`}
                      className="font-medium text-gray-700 hover:underline"
                    >
                      INV-{String(o.id).padStart(4, "0")}
                    </Link>
                  </td>
                  <td className="py-3 px-5">
                    <p className="font-medium text-gray-800">{o.client.name}</p>
                    {o.client.city && <p className="text-xs text-gray-400">{o.client.city}</p>}
                  </td>
                  <td className="py-3 px-5 text-gray-500">
                    {new Date(o.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 px-5 text-right tabular-nums font-medium text-gray-800">
                    Rs {fmt(o.saleAmount)}
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      o.paymentStatus === "PAID"    ? "bg-green-100 text-green-700" :
                      o.paymentStatus === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                                                      "bg-gray-100 text-gray-500"
                    }`}>
                      {o.paymentStatus === "PAID" ? "Paid" : o.paymentStatus === "PARTIAL" ? "Partial" : "Unpaid"}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-center">
                    {o.dispatched ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Dispatched
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                        Pending
                      </span>
                    )}
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
