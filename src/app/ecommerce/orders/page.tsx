import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DateRangeFilter from "@/components/DateRangeFilter";
import ConfirmOrdersTable from "@/components/ConfirmOrdersTable";
import ScanAndWeighModal from "@/components/ScanAndWeighModal";

export default async function EcomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; status?: string }>;
}) {
  const { q, from, to, status } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate   = to   ? new Date(`${to}T23:59:59.999`) : undefined;

  // "Dispatched" means the order's parcel has actually left through the
  // Scan & Dispatch gate — i.e. it's on a DispatchSheet that's been
  // dispatched — not just packed and waiting.
  const dispatchedSheets = status === "PACKED" || status === "DISPATCHED"
    ? await prisma.dispatchSheet.findMany({ where: { dispatchedAt: { not: null } }, select: { orderIds: true } })
    : [];
  const dispatchedOrderIds = dispatchedSheets.flatMap((s) => s.orderIds);

  const statusWhere =
    status === "CONFIRMED" ? { trackingNumber: null } :
    status === "BOOKED" ? { trackingNumber: { not: null }, packedAt: null } :
    status === "PACKED" ? { packedAt: { not: null }, id: { notIn: dispatchedOrderIds } } :
    status === "DISPATCHED" ? { id: { in: dispatchedOrderIds.length ? dispatchedOrderIds : [-1] } } :
    {};

  const orders = await prisma.ecomOrder.findMany({
    where: {
      draft: false,
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...statusWhere,
      ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { items: true, payments: true },
    orderBy: [{ confirmedAt: { sort: "desc", nulls: "last" } }, { date: "desc" }],
  });

  // Weight is only known once a parcel has been through Scan & Weigh.
  const trackingNumbers = orders.map((o) => o.trackingNumber).filter((t): t is string => !!t);
  const verifications = trackingNumbers.length
    ? await prisma.weightVerification.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
        orderBy: { createdAt: "asc" },
        select: { trackingNumber: true, weight: true },
      })
    : [];
  const weightByTracking: Record<string, number> = {};
  for (const v of verifications) weightByTracking[v.trackingNumber] = v.weight;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Confirm Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Confirmed Shopify orders — dispatch and track.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScanAndWeighModal />
        </div>
      </div>

      {/* Filter */}
      <form method="GET" className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search customer, phone, city..." className="flex-1 min-w-[180px] w-full sm:w-auto bg-gray-50 border border-transparent rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <DateRangeFilter from={from} to={to} />
        <select name="status" defaultValue={status ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black w-full sm:w-auto">
          <option value="">All orders</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="BOOKED">Booked</option>
          <option value="PACKED">Packed</option>
          <option value="DISPATCHED">Dispatched</option>
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2.5 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors w-full sm:w-auto">Filter</button>
        {(status || q || from || to) && <Link href="/ecommerce/orders" className="text-sm text-gray-400 hover:text-black px-2 text-center sm:text-left">Clear</Link>}
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
        <ConfirmOrdersTable orders={orders} weightByTracking={weightByTracking} />
      )}
    </div>
  );
}
