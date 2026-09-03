import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import EcomImportModal from "@/components/EcomImportModal";
import DeleteAllEcomOrdersButton from "@/components/DeleteAllEcomOrdersButton";
import DateRangeFilter from "@/components/DateRangeFilter";
import ConfirmOrdersTable from "@/components/ConfirmOrdersTable";
import ScanAndWeighModal from "@/components/ScanAndWeighModal";
import GenerateDispatchListButton from "@/components/GenerateDispatchListButton";

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
    orderBy: [{ confirmedAt: { sort: "desc", nulls: "last" } }, { date: "desc" }],
  });

  const dispatched   = orders.filter(o => o.trackingNumber);
  const undispatched = orders.filter(o => !o.trackingNumber);

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
          {isAdmin && <DeleteAllEcomOrdersButton orderCount={await prisma.ecomOrder.count()} />}
          <ScanAndWeighModal />
          <GenerateDispatchListButton />
          <Link href="/ecommerce/dispatch/airway-bills" className="text-sm text-gray-500 hover:text-[#16202E] px-2 underline decoration-dotted">
            Airway Bills
          </Link>
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
        <ConfirmOrdersTable orders={orders} weightByTracking={weightByTracking} />
      )}
    </div>
  );
}
