import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DispatchDateControls from "@/components/DispatchDateControls";

export const maxDuration = 30;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomDispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { from: fromParam, to: toParam } = await searchParams;
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const from = fromParam ?? todayPK;
  const to = toParam ?? todayPK;

  const dayStart = new Date(`${from}T00:00:00+05:00`);
  const dayEnd = new Date(`${to}T23:59:59+05:00`);

  const orders = await prisma.ecomOrder.findMany({
    where: { dispatchedAt: { gte: dayStart, lte: dayEnd } },
    select: {
      id: true,
      customerName: true,
      phone: true,
      city: true,
      address: true,
      totalAmount: true,
      trackingNumber: true,
      dispatchedAt: true,
      returned: true,
      items: { select: { description: true, quantity: true } },
    },
    orderBy: { dispatchedAt: "desc" },
  });

  const totalParcels = orders.length;
  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const returned = orders.filter((o) => o.returned).length;

  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })} — ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div>
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
          <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Daily Dispatch List</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        <DispatchDateControls from={from} to={to} basePath="/ecommerce/dispatch" />
      </div>

      <div className="hidden print:block mb-2">
        <p className="text-lg font-bold">The Boundary Shop — Dispatch List</p>
        <p className="text-sm text-gray-600">{dateLabel}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:hidden">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#16202E]" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Number of Parcels</p>
          <p className="text-3xl font-bold tabular-nums text-[#16202E]">{totalParcels}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#BFD732]" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Value of Parcels</p>
          <p className="text-3xl font-bold tabular-nums text-[#16202E]">Rs {fmt(totalValue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-400" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Returned</p>
          <p className="text-3xl font-bold tabular-nums text-[#16202E]">{returned}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center print:hidden">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-sm font-medium text-gray-500">No parcels dispatched in this date range</p>
          <p className="text-xs text-gray-400 mt-1">Try a different date range</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print:border-black print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium text-left bg-gray-50 print:bg-white print:border-black">
                  <th className="py-2.5 px-4">Order</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Tracking</th>
                  <th className="py-2.5 px-3">Dispatched</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-black">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">#{o.id}</td>
                    <td className="py-2.5 px-3">
                      <p className="text-gray-800">{o.customerName}</p>
                      {o.phone && <p className="text-xs text-gray-400 print:text-gray-600">{o.phone}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{o.city ?? "—"}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs max-w-[220px] truncate" title={o.items.map((i) => `${i.description} x${i.quantity}`).join(", ")}>
                      {o.items.length > 0 ? o.items.map((i) => `${i.description} x${i.quantity}`).join(", ") : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{o.trackingNumber ?? "—"}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs whitespace-nowrap">
                      {o.dispatchedAt?.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900 tabular-nums">Rs {fmt(o.totalAmount)}</td>
                    <td className="py-2.5 px-4">
                      {o.returned ? (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full print:bg-white print:border print:border-black">Returned</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full print:bg-white print:border print:border-black">Dispatched</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold print:bg-white print:border-black">
                  <td className="py-3 px-4" colSpan={6}>Total ({totalParcels} parcels)</td>
                  <td className="py-3 px-3 text-right tabular-nums">Rs {fmt(totalValue)}</td>
                  <td className="py-3 px-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
