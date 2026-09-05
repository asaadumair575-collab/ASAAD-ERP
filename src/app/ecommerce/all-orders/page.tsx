import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DateRangeFilter from "@/components/DateRangeFilter";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function statusBadge(o: { draft: boolean; returned: boolean; trackingNumber: string | null; packedAt: Date | null; status: string }) {
  if (o.draft) return { label: "Draft", cls: "border-gray-200 bg-gray-50 text-gray-500", dot: "bg-gray-300" };
  if (o.returned) return { label: "Returned", cls: "border-red-200 bg-red-50 text-red-600", dot: "bg-red-400" };
  if (o.trackingNumber && o.packedAt) return { label: "Packed", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (o.trackingNumber) return { label: "Booked", cls: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-400" };
  if (o.status === "PAID") return { label: "Delivered", cls: "border-green-200 bg-green-50 text-green-700", dot: "bg-green-500" };
  if (o.status === "PARTIAL") return { label: "Partial", cls: "border-yellow-200 bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" };
  return { label: "Confirmed", cls: "border-purple-200 bg-purple-50 text-purple-700", dot: "bg-purple-400" };
}

export default async function AllOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00+05:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59+05:00`) : undefined;

  // Keyed strictly off `date` — the timestamp the order actually arrived
  // from the website, set once at creation and never touched again by
  // confirmation, booking, packing, or dispatch. Every other order list in
  // the app shows the last status-update date instead, so this is the only
  // page that answers "who ordered on this specific day?" reliably.
  // No status filter of any kind — draft, confirmed, packed, dispatched,
  // returned all show up as long as the arrival date matches.
  const orders = await prisma.ecomOrder.findMany({
    where: {
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { items: true },
    orderBy: { date: "desc" },
  });

  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Every order, filtered by the date it actually arrived from the website — unaffected by confirmation, booking, or dispatch happening later.
        </p>
      </div>

      <form method="GET" className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search customer, phone, city..." className="flex-1 min-w-[180px] w-full sm:w-auto bg-gray-50 border border-transparent rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <DateRangeFilter from={from} to={to} />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2.5 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors w-full sm:w-auto">Filter</button>
        {(q || from || to) && <Link href="/ecommerce/all-orders" className="text-sm text-gray-400 hover:text-black px-2 text-center sm:text-left">Clear</Link>}
      </form>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-6 bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Orders Received</p>
          <p className="text-lg font-bold tabular-nums text-[#16202E]">{orders.length}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Value</p>
          <p className="text-lg font-bold tabular-nums text-[#16202E]">Rs {fmt(totalValue)}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-700">No orders received in this range</p>
          <p className="text-sm text-gray-400 mt-1">Try a different date range or search.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {orders.map((o) => {
              const badge = statusBadge(o);
              const orderLabel = o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`;
              return (
                <div key={o.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{orderLabel}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {o.date.toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium mt-1">{o.customerName}</p>
                  {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">Rs {fmt(o.totalAmount)}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium text-left">
                  <th className="py-2.5 px-4">Order</th>
                  <th className="py-2.5 px-3">Received</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const badge = statusBadge(o);
                  const orderLabel = o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-gray-900 text-xs">{orderLabel}</td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs whitespace-nowrap">
                        {o.date.toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="text-gray-900 text-xs font-medium">{o.customerName}</p>
                        {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 text-xs max-w-[220px] truncate">
                        {o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900 text-xs">Rs {fmt(o.totalAmount)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
