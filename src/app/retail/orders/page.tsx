import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const orders = await prisma.retailOrder.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { items: true, payments: true },
    orderBy: { date: "desc" },
  });

  const pendingCount = await prisma.retailOrder.count({ where: { status: { in: ["PENDING", "PARTIAL"] } } });
  const pendingAmount = await prisma.retailOrder.findMany({
    where: { status: { in: ["PENDING", "PARTIAL"] } },
    include: { payments: true },
  }).then((rows) =>
    rows.reduce((s, o) => {
      const paid = o.payments.reduce((ps, p) => ps + p.amount, 0);
      return s + Math.max(0, o.totalAmount - paid);
    }, 0)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retail / COD</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Small orders — collect a delivery advance, ship the goods, receive payment later.
          </p>
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
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500">Pending Recovery</p>
          <p className="text-xl font-semibold mt-1 text-orange-600">Rs {fmt(pendingAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingCount} orders unpaid / partial</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-xl font-semibold mt-1">{orders.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {orders.filter((o) => o.status === "PAID").length} paid
          </p>
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
        <select
          name="status"
          defaultValue={status ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All status</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {(status || q) && (
          <Link href="/retail/orders" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
        )}
      </form>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No retail orders found.</p>
          <Link href="/retail/orders/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">
            + Create your first order
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
                <th className="py-3 px-5 text-right">Advance</th>
                <th className="py-3 px-5 text-right">Received</th>
                <th className="py-3 px-5 text-right">Balance</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => {
                const received = o.payments.reduce((s, p) => s + p.amount, 0);
                const balance = Math.max(0, o.totalAmount - received);
                return (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/retail/${o.id}`} className="font-medium hover:underline text-gray-700">
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
                    <td className="py-3 px-5 text-right tabular-nums text-gray-500">
                      {o.deliveryCharge > 0 ? `Rs ${fmt(o.deliveryCharge)}` : "—"}
                    </td>
                    <td className="py-3 px-5 text-right tabular-nums text-gray-600">Rs {fmt(received)}</td>
                    <td className={`py-3 px-5 text-right tabular-nums font-medium ${balance > 0 ? "text-orange-600" : "text-green-700"}`}>
                      {balance > 0 ? `Rs ${fmt(balance)}` : "✓"}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        o.status === "PAID" ? "bg-green-100 text-green-700" :
                        o.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {o.status}
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
