import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function RetailDispatchPage() {
  const orders = await prisma.retailOrder.findMany({
    where: { dispatched: true },
    include: { items: true },
    orderBy: { dispatchedAt: "desc" },
  });

  // Group by dispatch date
  const groups = new Map<string, typeof orders>();
  for (const o of orders) {
    const key = o.dispatchedAt ? fmtDate(o.dispatchedAt) : fmtDate(o.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dispatched retail orders grouped by date</p>
      </div>

      {sortedDates.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No dispatched orders yet.</p>
        </div>
      )}

      {sortedDates.map((date) => {
        const dayOrders = groups.get(date)!;
        const totalAmount = dayOrders.reduce((s, o) => s + o.totalAmount, 0);
        const totalDozens = dayOrders.reduce(
          (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0),
          0
        );

        return (
          <div key={date} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Date header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-800">{date}</p>
                <span className="text-xs text-gray-400">{dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{totalDozens} doz</span>
                <span className="font-semibold text-gray-800">Rs {fmt(totalAmount)}</span>
              </div>
            </div>

            {/* Orders table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="py-2 px-5">#</th>
                    <th className="py-2 px-5">Customer</th>
                    <th className="py-2 px-5">Items</th>
                    <th className="py-2 px-5 text-right">Dozens</th>
                    <th className="py-2 px-5 text-right">Amount</th>
                    <th className="py-2 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dayOrders.map((o) => {
                    const dozens = o.items.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-5">
                          <Link href={`/retail/orders/${o.id}`} className="font-medium hover:underline text-gray-700">
                            R-{String(o.id).padStart(3, "0")}
                          </Link>
                        </td>
                        <td className="py-3 px-5">
                          <p className="font-medium">{o.customerName}</p>
                          {(o.phone || o.city) && (
                            <p className="text-xs text-gray-400">{[o.phone, o.city].filter(Boolean).join(" · ")}</p>
                          )}
                        </td>
                        <td className="py-3 px-5 text-gray-500 text-xs">
                          {o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums text-gray-600">{dozens}</td>
                        <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                        <td className="py-3 px-5 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            o.status === "PAID" ? "bg-green-100 text-green-700" :
                            o.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {o.status === "PAID" ? "Delivered" : o.status === "PARTIAL" ? "Partial" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
