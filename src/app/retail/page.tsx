import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailOverviewPage() {
  const [allOrders, customers] = await Promise.all([
    prisma.retailOrder.findMany({ include: { payments: true }, orderBy: { date: "desc" } }),
    prisma.retailCustomer.findMany(),
  ]);

  const totalRevenue = allOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalReceived = allOrders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const totalPending = Math.max(0, totalRevenue - totalReceived);
  const pendingOrders = allOrders.filter((o) => o.status === "PENDING").length;
  const partialOrders = allOrders.filter((o) => o.status === "PARTIAL").length;
  const paidOrders = allOrders.filter((o) => o.status === "PAID").length;
  const recentOrders = allOrders.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retail / COD</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overview of COD orders, retail customers, and payments.
          </p>
        </div>
        <Link
          href="/retail/orders/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Billed</p>
          <p className="text-2xl font-bold tracking-tight">Rs {fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{allOrders.length} orders</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Received</p>
          <p className="text-2xl font-bold tracking-tight text-green-700">Rs {fmt(totalReceived)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{paidOrders} fully paid</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm ${totalPending > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending Recovery</p>
          <p className={`text-2xl font-bold tracking-tight ${totalPending > 0 ? "text-orange-600" : "text-green-700"}`}>
            Rs {fmt(totalPending)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{pendingOrders + partialOrders} open orders</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Customers</p>
          <p className="text-2xl font-bold tracking-tight">{customers.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">retail accounts</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/retail/orders"
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-400 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Orders</p>
              <p className="text-xs text-gray-500 mt-0.5">View and manage all COD orders</p>
            </div>
            <span className="text-gray-300 group-hover:text-gray-600 text-xl">→</span>
          </div>
          <div className="flex gap-3 mt-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{pendingOrders} pending</span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{partialOrders} partial</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{paidOrders} paid</span>
          </div>
        </Link>
        <Link
          href="/retail/customers"
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-400 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Customers</p>
              <p className="text-xs text-gray-500 mt-0.5">View retail customer list and ledger</p>
            </div>
            <span className="text-gray-300 group-hover:text-gray-600 text-xl">→</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">{customers.length} customer{customers.length !== 1 ? "s" : ""} registered</p>
        </Link>
        <Link
          href="/retail/finance"
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-400 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Finance</p>
              <p className="text-xs text-gray-500 mt-0.5">Monthly breakdown, product sales, customer balances</p>
            </div>
            <span className="text-gray-300 group-hover:text-gray-600 text-xl">→</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">Rs {fmt(totalRevenue)} total billed</p>
        </Link>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Orders</p>
            <Link href="/retail/orders" className="text-xs font-medium text-black hover:underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((o) => {
                const rec = o.payments.reduce((s, p) => s + p.amount, 0);
                const bal = Math.max(0, o.totalAmount - rec);
                return (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/retail/orders/${o.id}`} className="font-medium hover:underline">
                        R-{String(o.id).padStart(3, "0")}
                      </Link>
                      <p className="text-xs text-gray-400">{o.customerName}</p>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{o.date.toISOString().slice(0, 10)}</td>
                    <td className="py-3 px-5 text-right tabular-nums">Rs {fmt(o.totalAmount)}</td>
                    <td className="py-3 px-5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        o.status === "PAID" ? "bg-green-100 text-green-700" :
                        o.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {bal > 0 ? `Rs ${fmt(bal)} due` : "✓ Paid"}
                      </span>
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
