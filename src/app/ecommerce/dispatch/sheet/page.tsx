import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DispatchDateControls from "@/components/DispatchDateControls";
import AutoPrint from "@/components/AutoPrint";

export const maxDuration = 30;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomDispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; print?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { date: dateParam, print } = await searchParams;
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const date = dateParam ?? todayPK;

  const dayStart = new Date(`${date}T00:00:00+05:00`);
  const dayEnd = new Date(`${date}T23:59:59+05:00`);

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

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {print === "1" && <AutoPrint />}
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm print:hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Daily Dispatch List</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Print-only letterhead + stat summary */}
      <div className="hidden print:block">
        <div className="flex items-end justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <p className="text-xl font-bold tracking-tight">The Boundary Shop</p>
            <p className="text-sm text-gray-600 mt-0.5">Daily Dispatch List</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{dateLabel}</p>
            <p className="text-xs text-gray-500">Generated {new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Number of Parcels</p>
            <p className="text-2xl font-bold tabular-nums">{totalParcels}</p>
          </div>
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Value</p>
            <p className="text-2xl font-bold tabular-nums">Rs {fmt(totalValue)}</p>
          </div>
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Returned</p>
            <p className="text-2xl font-bold tabular-nums">{returned}</p>
          </div>
        </div>
      </div>

      <DispatchDateControls date={date} basePath="/ecommerce/dispatch/sheet" />

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
          <p className="text-sm font-medium text-gray-500">No parcels dispatched on this date</p>
          <p className="text-xs text-gray-400 mt-1">Try a different date</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm print:text-[10px] print:table-fixed">
              <colgroup className="hidden print:table-column-group">
                <col className="print:w-[9%]" />
                <col className="print:w-[19%]" />
                <col className="print:w-[12%]" />
                <col className="print:w-[29%]" />
                <col className="print:w-[19%]" />
                <col className="print:w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium text-left bg-gray-50 print:bg-white print:border-b-2 print:border-black print:text-black">
                  <th className="py-2.5 px-4 print:px-1.5 print:py-1.5">Order</th>
                  <th className="py-2.5 px-3 print:px-1.5">Customer</th>
                  <th className="py-2.5 px-3 print:px-1.5">City</th>
                  <th className="py-2.5 px-3 print:px-1.5">Items</th>
                  <th className="py-2.5 px-3 print:px-1.5">Tracking</th>
                  <th className="py-2.5 px-4 text-right print:px-1.5">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                {orders.map((o, i) => (
                  <tr key={o.id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 1 ? "print:bg-gray-50" : ""}`}>
                    <td className="py-2.5 px-4 print:px-1.5 print:py-1 font-semibold text-gray-900">#{o.id}</td>
                    <td className="py-2.5 px-3 print:px-1.5 print:py-1">
                      <p className="text-gray-800 print:truncate">{o.customerName}</p>
                      {o.phone && <p className="text-xs text-gray-400 print:text-[9px] print:text-gray-600">{o.phone}</p>}
                    </td>
                    <td className="py-2.5 px-3 print:px-1.5 print:py-1 text-gray-600">{o.city ?? "—"}</td>
                    <td className="py-2.5 px-3 print:px-1.5 print:py-1 text-gray-500 text-xs print:text-[9px] max-w-[220px] print:max-w-none truncate" title={o.items.map((i) => `${i.description} x${i.quantity}`).join(", ")}>
                      {o.items.length > 0 ? o.items.map((i) => `${i.description} x${i.quantity}`).join(", ") : "—"}
                    </td>
                    <td className="py-2.5 px-3 print:px-1.5 print:py-1 font-mono text-xs print:text-[9px] text-gray-600 print:truncate">{o.trackingNumber ?? "—"}</td>
                    <td className="py-2.5 px-4 print:px-1.5 print:py-1 text-right font-semibold text-gray-900 tabular-nums">Rs {fmt(o.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold print:bg-white print:border-black">
                  <td className="py-3 px-4" colSpan={5}>Total ({totalParcels} parcels)</td>
                  <td className="py-3 px-4 text-right tabular-nums">Rs {fmt(totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
