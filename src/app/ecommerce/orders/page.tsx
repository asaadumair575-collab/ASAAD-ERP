import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import EcomImportModal from "@/components/EcomImportModal";
import DeleteAllEcomOrdersButton from "@/components/DeleteAllEcomOrdersButton";
import DateRangeFilter from "@/components/DateRangeFilter";
import MoveToDraftButton from "@/components/MoveToDraftButton";

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
  const toDate   = to   ? new Date(`${to}T23:59:59.999`) : undefined;

  const orders = await prisma.ecomOrder.findMany({
    where: {
      draft: false,
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(status === "RETURNED" ? { returned: true } : status ? { status } : {}),
      ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { items: true, payments: true },
    orderBy: { date: "desc" },
  });

  const dispatched   = orders.filter(o => o.trackingNumber);
  const undispatched = orders.filter(o => !o.trackingNumber);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Confirm Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Confirmed Shopify orders — dispatch and track.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-orange-100 text-orange-700 font-semibold px-3 py-1 rounded-full">{undispatched.length} to dispatch</span>
            <span className="bg-blue-100 text-blue-700 font-medium px-3 py-1 rounded-full">{dispatched.length} dispatched</span>
          </div>
          {isAdmin && <DeleteAllEcomOrdersButton />}
          <EcomImportModal />
          <Link href="/ecommerce/orders/new" className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            + New Order
          </Link>
        </div>
      </div>

      {/* Filter */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search customer, phone, city..." className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <DateRangeFilter from={from} to={to} />
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
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-gray-400"><rect x="2" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <p className="text-base font-semibold text-gray-700">No confirmed orders</p>
          <p className="text-sm text-gray-400 mt-1">Confirm orders from Draft Orders to see them here.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium text-left">
                <th className="py-2.5 px-4">Order</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => {
                const orderLabel = o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`;
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-2.5 px-4 font-semibold text-gray-900 text-xs">{orderLabel}</td>
                    <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">
                      {o.date.toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-gray-900 text-xs font-medium">{o.customerName}</p>
                      {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 text-xs max-w-[200px] truncate">
                      {o.items.map(i => `${i.description} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900 text-xs">Rs {fmt(o.totalAmount)}</td>
                    <td className="py-2.5 px-3">
                      {o.returned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Returned
                        </span>
                      ) : o.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Delivered
                        </span>
                      ) : o.status === "PARTIAL" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Confirmed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoveToDraftButton id={o.id} />
                        <Link href={`/ecommerce/orders/${o.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                          View →
                        </Link>
                      </div>
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
