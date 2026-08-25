import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DateRangeFilter from "@/components/DateRangeFilter";
import RetailExportModal from "@/components/RetailExportModal";
import RetailBulkDispatch from "@/components/RetailBulkDispatch";
import { userLabel } from "@/lib/userLabel";
import { getSessionUser } from "@/lib/auth";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function RetailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  const { status, q, from, to } = await searchParams;
  const me = await getSessionUser();
  const isAdmin = me?.isAdmin ?? false;

  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const orders = await prisma.retailOrder.findMany({
    where: {
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
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
    include: { items: true, createdBy: { select: { displayName: true, username: true, isAdmin: true } } },
    orderBy: { date: "desc" },
  });


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
        <div className="flex items-center gap-2 shrink-0">
          {/* placeholder for layout — actual dispatch is inline */}
          <RetailExportModal />
          <Link
            href="/retail/orders/new"
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            + New Order
          </Link>
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
        <DateRangeFilter from={from} to={to} />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All orders</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Delivered</option>
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {(status || q || from || to) && (
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
        <RetailBulkDispatch
          orders={orders.map(o => ({
            id: o.id,
            customerName: o.customerName,
            phone: o.phone,
            city: o.city,
            address: o.address,
            totalAmount: o.totalAmount,
            dispatched: o.dispatched,
            trackingNumber: o.trackingNumber,
            date: o.date.toISOString().slice(0, 10),
            status: o.status,
            items: o.items.map(i => ({ description: i.description, quantity: i.quantity })),
            createdByName: o.createdBy ? userLabel(o.createdBy) : null,
          }))}
        />
      )}
    </div>
  );
}
