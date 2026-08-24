import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DraftStatusSelect from "@/components/DraftStatusSelect";
import ConfirmDraftButton from "@/components/ConfirmDraftButton";
import DateRangeFilter from "@/components/DateRangeFilter";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
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
    include: { items: true },
    orderBy: { date: "desc" },
  });

  const pending   = orders.filter(o => !o.draftStatus || o.draftStatus === "");
  const inProcess = orders.filter(o => o.draftStatus && o.draftStatus !== "CONFIRMED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Draft Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Incoming Shopify orders — review and confirm to process.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-orange-100 text-orange-700 font-semibold px-3 py-1 rounded-full">{pending.length} new</span>
          <span className="bg-gray-100 text-gray-600 font-medium px-3 py-1 rounded-full">{orders.length} total</span>
        </div>
      </div>

      {/* Filter */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text" name="q" defaultValue={q ?? ""}
          placeholder="Search customer, phone, order #..."
          className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
        />
        <DateRangeFilter from={from} to={to} />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
        {(q || from || to) && <Link href="/ecommerce/shopify-orders" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>}
      </form>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-gray-400"><path d="M6 2h12l3 7H3L6 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 9v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 13v4M10 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <p className="text-base font-semibold text-gray-700">No draft orders</p>
          <p className="text-sm text-gray-400 mt-1">New Shopify orders appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const statusInfo = o.draftStatus ? STATUS_LABELS[o.draftStatus] : null;
            const orderLabel = o.notes?.replace("Shopify Order ", "") ?? `#${o.shopifyOrderId}`;
            return (
              <div key={o.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                  <span className="font-mono text-xs font-semibold text-gray-500 tracking-wide">{orderLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{o.date.toISOString().slice(0, 10)}</span>
                    {statusInfo && (
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Customer */}
                    <div>
                      <p className="font-semibold text-gray-900">{o.customerName}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{[o.phone, o.city].filter(Boolean).join(" · ")}</p>
                    </div>
                    {/* Items */}
                    <div className="flex flex-wrap gap-1.5">
                      {o.items.map((i, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-lg">
                          {i.description}
                          <span className="text-gray-400">×{i.quantity}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <p className="text-xl font-bold text-gray-900">Rs {fmt(o.totalAmount)}</p>
                    <ConfirmDraftButton id={o.id} />
                  </div>
                </div>

                {/* Status footer */}
                <div className="px-5 pb-4">
                  <DraftStatusSelect id={o.id} initial={o.draftStatus ?? null} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
