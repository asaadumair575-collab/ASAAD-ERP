import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function EcomPage() {
  const orders = await prisma.ecomOrder.findMany({
    include: { items: true, payments: true },
    orderBy: { date: "desc" },
  });

  const groups = new Map<string, typeof orders>();
  for (const o of orders) {
    const key = fmtDate(o.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ecommerce</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily orders overview</p>
        </div>
        <Link href="/ecommerce/orders/new" className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          + New Order
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Orders</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-bold">Rs {fmt(totalRevenue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Days</p>
          <p className="text-2xl font-bold">{sortedDates.length}</p>
        </div>
      </div>

      {sortedDates.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No orders yet.</p>
          <Link href="/ecommerce/orders/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">+ Create your first order</Link>
        </div>
      )}

      {sortedDates.map((date) => {
        const dayOrders = groups.get(date)!;
        const dayRevenue = dayOrders.reduce((s, o) => s + o.totalAmount, 0);
        const dayDozens = dayOrders.reduce((s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0);
        return (
          <div key={date} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-800">{date}</p>
                <span className="text-xs text-gray-400">{dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{dayDozens} doz</span>
                <span className="font-semibold text-gray-800">Rs {fmt(dayRevenue)}</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {dayOrders.map((o) => {
                return (
                  <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <Link href={`/ecommerce/orders/${o.id}`} className="text-sm font-medium hover:underline text-gray-700">
                        E-{String(o.id).padStart(3, "0")}
                      </Link>
                      <span className="text-sm text-gray-700">{o.customerName}</span>
                      {o.city && <span className="text-xs text-gray-400">{o.city}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums font-medium">Rs {fmt(o.totalAmount)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        o.status === "PAID" ? "bg-green-100 text-green-700" :
                        o.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {o.status === "PAID" ? "Paid" : o.status === "PARTIAL" ? "Partial" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
