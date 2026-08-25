import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DraftStatusModal from "@/components/DraftStatusModal";
import DateRangeFilter from "@/components/DateRangeFilter";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Today at ${date.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return `Yesterday`;
  if (days < 7) return date.toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" });
  return date.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  CALL_NOT_PICKED: { label: "Call Not Picked", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  NUMBER_OFF:      { label: "Number Off",      color: "bg-orange-50 text-orange-700 border-orange-200" },
  CANCELLED:       { label: "Cancelled",        color: "bg-red-50 text-red-600 border-red-200" },
  CONFIRMED:       { label: "Confirmed",        color: "bg-green-50 text-green-700 border-green-200" },
};

export default async function DraftOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { q, from, to } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate   = to   ? new Date(`${to}T23:59:59.999`) : undefined;

  const orders = await prisma.ecomOrder.findMany({
    where: {
      draft: true,
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(q ? {
        OR: [
          { customerName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { city: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: { items: true, statusLogs: { orderBy: { createdAt: "asc" } } },
    orderBy: { date: "desc" },
  });

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => o.date >= todayStart);
  const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
  const pendingCount = orders.filter(o => !o.draftStatus).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Draft Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Incoming Shopify orders — confirm to process.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Today</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{todayOrders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pending Review</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">Rs {fmt(totalAmount)}</p>
        </div>
      </div>

      {/* Filter */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search customer, phone, order #..."
          className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white" />
        <DateRangeFilter from={from} to={to} />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
        {(q || from || to) && <Link href="/ecommerce/shopify-orders" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>}
      </form>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-700">No draft orders</p>
          <p className="text-sm text-gray-400 mt-1">New Shopify orders appear here automatically.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium text-left">
                <th className="py-2.5 pl-4 pr-2 w-8">
                  <input type="checkbox" className="rounded border-gray-300" disabled />
                </th>
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => {
                const label = o.notes?.replace("Shopify Order ", "") ?? `#${o.shopifyOrderId}`;
                const statusMeta = o.draftStatus ? STATUS_META[o.draftStatus] : null;
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-2.5 pl-4 pr-2">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      <Link href={`/ecommerce/shopify-orders/${o.id}`} className="hover:text-blue-600 hover:underline transition-colors">
                        {label}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs whitespace-nowrap">{timeAgo(o.date)}</td>
                    <td className="py-2.5 px-3">
                      <p className="text-gray-900">{o.customerName}</p>
                      {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs max-w-[200px] truncate">
                      {o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-900">Rs {fmt(o.totalAmount)}</td>
                    <td className="py-2.5 px-3">
                      <DraftStatusModal id={o.id} initial={o.draftStatus ?? null} logs={o.statusLogs} />
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
