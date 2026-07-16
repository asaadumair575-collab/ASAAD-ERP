import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailCompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;

  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const orders = await prisma.retailOrder.findMany({
    where: {
      status: "PAID",
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(q ? {
        OR: [
          { customerName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: { items: true, payments: true },
    orderBy: { date: "desc" },
  });

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalReceived = orders.reduce((s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Completed Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">All fully paid retail / COD orders.</p>
        </div>
        <Link
          href="/retail/orders/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-xl font-semibold mt-1 text-green-700">Rs {fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{orders.length} paid orders</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Received</p>
          <p className="text-xl font-semibold mt-1">Rs {fmt(totalReceived)}</p>
          <p className="text-xs text-gray-400 mt-1">fully collected</p>
        </div>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search customer, phone, city..."
          className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
        />
        <input
          type="date"
          name="from"
          defaultValue={from ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <input
          type="date"
          name="to"
          defaultValue={to ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {(q || from || to) && (
          <Link href="/retail/completed" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
        )}
      </form>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No completed orders yet.</p>
          <Link href="/retail/orders" className="mt-3 inline-block text-sm font-medium text-black hover:underline">
            View pending orders
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5 text-right">Total</th>
                <th className="py-3 px-5 text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => {
                const received = o.payments.reduce((s, p) => s + p.amount, 0);
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
                    <td className="py-3 px-5 text-gray-500">{o.date.toISOString().slice(0, 10)}</td>
                    <td className="py-3 px-5 text-gray-500 text-xs">
                      {o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                    <td className="py-3 px-5 text-right tabular-nums text-green-700 font-medium">Rs {fmt(received)}</td>
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
