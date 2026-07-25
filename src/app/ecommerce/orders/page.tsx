import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteAllEcomOrders } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import DeleteAllEcomOrdersButton from "@/components/DeleteAllEcomOrdersButton";
import EcomImportModal from "@/components/EcomImportModal";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; status?: string }>;
}) {
  const { q, from, to, status } = await searchParams;
  const me = await getSessionUser();
  const isAdmin = me?.isAdmin ?? false;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const orders = await prisma.ecomOrder.findMany({
    where: {
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(status === "RETURNED" ? { returned: true } : status ? { status } : {}),
      ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { items: true, payments: true },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ecommerce Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">All ecommerce orders</p>
        </div>
        <div className="flex items-center gap-2">
          <EcomImportModal />
          {isAdmin && <DeleteAllEcomOrdersButton action={deleteAllEcomOrders} />}
          <Link href="/ecommerce/orders/new" className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            + New Order
          </Link>
        </div>
      </div>

      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search customer, phone, city..." className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <input type="date" name="from" defaultValue={from ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <input type="date" name="to" defaultValue={to ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <select name="status" defaultValue={status ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
          <option value="">All orders</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Delivered</option>
          <option value="RETURNED">Returned</option>
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
        {(status || q || from || to) && <Link href="/ecommerce/orders" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>}
      </form>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No orders found.</p>
          <Link href="/ecommerce/orders/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">+ New Order</Link>
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
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-5">
                    <Link href={`/ecommerce/orders/${o.id}`} className="font-medium hover:underline text-gray-700">E-{String(o.id).padStart(3, "0")}</Link>
                  </td>
                  <td className="py-3 px-5">
                    <p className="font-medium">{o.customerName}</p>
                    {(o.phone || o.city) && <p className="text-xs text-gray-400">{[o.phone, o.city].filter(Boolean).join(" · ")}</p>}
                  </td>
                  <td className="py-3 px-5 text-gray-500">{o.date.toISOString().slice(0, 10)}</td>
                  <td className="py-3 px-5 text-gray-500 text-xs">{o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</td>
                  <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                  <td className="py-3 px-5 text-right">
                    {o.returned ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Returned</span>
                    ) : o.status === "PAID" ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Delivered</span>
                    ) : o.status === "PARTIAL" ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Partial</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>
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
