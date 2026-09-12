import { prisma } from "@/lib/prisma";
import LiveRefresh from "@/components/LiveRefresh";
import Link from "next/link";
import DateRangeFilter from "@/components/DateRangeFilter";
import ConfirmOrdersTable from "@/components/ConfirmOrdersTable";
import ScanAndWeighModal from "@/components/ScanAndWeighModal";
import { dispatchSheetNumber } from "@/lib/dispatchSheetNumber";
import { getSessionUser } from "@/lib/auth";
import { parsePermissions, canViewSub } from "@/lib/permissions";
import { pkDayStart, pkDayEnd, todayPK } from "@/lib/tz";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; status?: string }>;
}) {
  const me = await getSessionUser();
  const canBookPostex = !!me && canViewSub(parsePermissions(me.permissions), "ecom_book_postex", me.isAdmin);
  const canGenerateDispatch = !!me && canViewSub(parsePermissions(me.permissions), "ecom_generate_dispatch", me.isAdmin);
  const canPrintLabels = !!me && canViewSub(parsePermissions(me.permissions), "ecom_print_labels", me.isAdmin);
  const { q, from, to, status } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate   = to   ? new Date(`${to}T23:59:59.999`) : undefined;

  // "Dispatched" means the order's parcel has actually left through the
  // Scan & Dispatch gate — i.e. it's on a DispatchSheet that's been
  // dispatched — not just packed and waiting. Needed both for the filter
  // and to show the right badge per row.
  const allSheets = await prisma.dispatchSheet.findMany({ select: { id: true, orderIds: true, dispatchedAt: true } });
  const dispatchedOrderIds = allSheets.filter((s) => s.dispatchedAt).flatMap((s) => s.orderIds);

  // Which dispatch sheet (if any) each order has been included in, whether
  // that sheet has actually been dispatched yet or not.
  const sheetByOrderId: Record<number, { id: number; number: string }> = {};
  for (const s of allSheets) {
    for (const orderId of s.orderIds) sheetByOrderId[orderId] = { id: s.id, number: dispatchSheetNumber(s.id) };
  }

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

  // Independent of the filters above — always "how many parcels got
  // confirmed today and for how much", regardless of what date range or
  // status the list is currently filtered to.
  const confirmedTodayAgg = await prisma.ecomOrder.aggregate({
    where: { draft: false, confirmedAt: { gte: pkDayStart(todayPK()), lte: pkDayEnd(todayPK()) } },
    _count: { _all: true },
    _sum: { totalAmount: true },
  });
  const confirmedTodayCount = confirmedTodayAgg._count._all;
  const confirmedTodayAmount = confirmedTodayAgg._sum.totalAmount ?? 0;

  return (
    <div className="space-y-6">
      <LiveRefresh />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Confirmed Shopify orders — dispatch and track.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ScanAndWeighModal />
        </div>
      </div>

      {/* Today's confirmed parcels — how many closed today, and for how much */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">Confirmed Today</p>
          <p className="text-2xl font-bold text-green-800 mt-0.5 tabular-nums">{confirmedTodayCount}</p>
          <p className="text-xs text-green-600 mt-0.5">parcel{confirmedTodayCount === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">Amount Confirmed Today</p>
          <p className="text-2xl font-bold text-green-800 mt-0.5 tabular-nums">Rs {fmt(confirmedTodayAmount)}</p>
          <p className="text-xs text-green-600 mt-0.5">order value</p>
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
        <ConfirmOrdersTable orders={orders} weightByTracking={weightByTracking} dispatchedOrderIds={dispatchedOrderIds} sheetByOrderId={sheetByOrderId} canBookPostex={canBookPostex} canGenerateDispatch={canGenerateDispatch} canPrintLabels={canPrintLabels} isAdmin={!!me?.isAdmin} />
      )}
    </div>
  );
}
