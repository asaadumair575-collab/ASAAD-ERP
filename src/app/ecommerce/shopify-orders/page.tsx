import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ConfirmDraftButton from "@/components/ConfirmDraftButton";
import DraftStatusSelect from "@/components/DraftStatusSelect";
import DateRangeFilter from "@/components/DateRangeFilter";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function DraftOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { q, from, to } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Draft Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Orders from Shopify — confirm to move them to Ecommerce Orders.
        </p>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search customer, phone, order #..."
          className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
        />
        <DateRangeFilter from={from} to={to} />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {(q || from || to) && (
          <Link href="/ecommerce/shopify-orders" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
        )}
      </form>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="text-base font-semibold text-gray-700">No draft orders</p>
          <p className="text-sm text-gray-400 mt-1">
            {(q || from || to) ? "No orders match your filter." : "New Shopify orders will appear here automatically."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-400">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
            {(from || to) && ` · ${from ?? ""}${from && to ? " → " : ""}${to ?? ""}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left border-b border-gray-100">
                  <th className="py-3 px-5">Order</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Items</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5 font-mono text-xs text-gray-400">
                      {o.notes?.replace("Shopify Order ", "") ?? `#${o.shopifyOrderId}`}
                    </td>
                    <td className="py-3 px-5">
                      <p className="font-medium">{o.customerName}</p>
                      {(o.phone || o.city) && (
                        <p className="text-xs text-gray-400">{[o.phone, o.city].filter(Boolean).join(" · ")}</p>
                      )}
                    </td>
                    <td className="py-3 px-5 text-gray-500 text-xs">
                      {o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="py-3 px-5 text-gray-400 text-xs whitespace-nowrap">{o.date.toISOString().slice(0, 10)}</td>
                    <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                    <td className="py-3 px-5">
                      <DraftStatusSelect id={o.id} initial={o.draftStatus ?? null} />
                    </td>
                    <td className="py-3 px-5 text-center">
                      <ConfirmDraftButton id={o.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
