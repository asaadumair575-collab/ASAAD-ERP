import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function ShopifyDashboardPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayOrders,
    monthOrders,
    pendingReview,
    confirmed,
    recentOrders,
  ] = await Promise.all([
    // Today's new Shopify orders
    prisma.ecomOrder.findMany({
      where: { draft: true, date: { gte: todayStart, lt: todayEnd } },
      select: { totalAmount: true, draftStatus: true },
    }),
    // This month's confirmed orders
    prisma.ecomOrder.findMany({
      where: { draft: false, returned: false, date: { gte: monthStart } },
      select: { totalAmount: true },
    }),
    // Currently pending review (draft, not cancelled)
    prisma.ecomOrder.count({
      where: { draft: true, draftStatus: { not: "CANCELLED" } },
    }),
    // Confirmed today
    prisma.ecomOrder.count({
      where: { draft: false, date: { gte: todayStart, lt: todayEnd } },
    }),
    // Recent 10 orders
    prisma.ecomOrder.findMany({
      where: { draft: true },
      orderBy: { date: "desc" },
      take: 10,
      select: { id: true, customerName: true, city: true, totalAmount: true, date: true, draftStatus: true },
    }),
  ]);

  const todayCount = todayOrders.length;
  const todayRevenue = todayOrders.reduce((s, o) => s + o.totalAmount, 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const monthCount = monthOrders.length;

  const statusLabel: Record<string, string> = {
    CALL_NOT_PICKED: "Not Picked",
    NUMBER_OFF: "Number Off",
    CANCELLED: "Cancelled",
    CONFIRMED: "Confirmed",
  };
  const statusColor: Record<string, string> = {
    CALL_NOT_PICKED: "bg-yellow-100 text-yellow-700",
    NUMBER_OFF: "bg-red-100 text-red-600",
    CANCELLED: "bg-gray-100 text-gray-400",
    CONFIRMED: "bg-green-100 text-green-700",
  };

  const dateLabel = now.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" });
  const monthLabel = now.toLocaleDateString("en-PK", { month: "long", year: "numeric" });

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{dateLabel}</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-0.5">Shopify Dashboard</h1>
      </div>

      {/* Today stat cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Today</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="New Orders" value={todayCount} color="blue" />
          <StatCard label="Revenue" value={`Rs ${fmt(todayRevenue)}`} color="green" />
          <StatCard label="Confirmed" value={confirmed} color="emerald" />
          <StatCard label="Pending Review" value={pendingReview} color="amber" />
        </div>
      </div>

      {/* This month */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{monthLabel}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">Orders Delivered</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{monthCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">Revenue</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">Rs {fmt(monthRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Recent incoming orders */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Shopify Orders</p>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No orders yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">City</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium">
                      {o.customerName}
                      <span className="block text-xs text-gray-400 font-normal">
                        {new Date(o.date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{o.city ?? "—"}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                    <td className="py-3 px-4 text-right">
                      {o.draftStatus ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[o.draftStatus] ?? "bg-gray-100 text-gray-500"}`}>
                          {statusLabel[o.draftStatus] ?? o.draftStatus}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`border rounded-2xl p-4 shadow-sm ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
