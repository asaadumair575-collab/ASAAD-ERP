import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DispatchDateControls from "@/components/DispatchDateControls";
import AutoPrint from "@/components/AutoPrint";

export const maxDuration = 30;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function FinalDispatchListPage({
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

  // Latest weight verification per tracking number, verified on this date.
  const verifications = await prisma.weightVerification.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    orderBy: { createdAt: "asc" },
    select: { id: true, trackingNumber: true, weight: true, createdAt: true },
  });

  const latestByTracking = new Map<string, (typeof verifications)[number]>();
  for (const v of verifications) latestByTracking.set(v.trackingNumber, v);
  const rows = [...latestByTracking.values()];

  const trackingNumbers = rows.map((r) => r.trackingNumber);
  const orders = trackingNumbers.length
    ? await prisma.ecomOrder.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
        select: { id: true, trackingNumber: true, customerName: true, city: true },
      })
    : [];
  const orderByTracking = new Map(orders.map((o) => [o.trackingNumber!, o]));

  const parcels = rows
    .map((r) => ({
      trackingNumber: r.trackingNumber,
      weight: r.weight,
      order: orderByTracking.get(r.trackingNumber) ?? null,
    }))
    .sort((a, b) => (a.order?.id ?? 0) - (b.order?.id ?? 0));

  const totalWeight = parcels.reduce((s, p) => s + p.weight, 0);
  const totalParcels = parcels.length;

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      {print === "1" && <AutoPrint />}
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm print:hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Final Dispatch List</h1>
        <p className="text-sm text-gray-400 mt-0.5">Weight-verified parcels for gate handover</p>
      </div>

      <div className="hidden print:block">
        <div className="flex items-end justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <p className="text-xl font-bold tracking-tight">The Boundary Shop</p>
            <p className="text-sm text-gray-600 mt-0.5">Final Dispatch List — Gate Verification</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{dateLabel}</p>
            <p className="text-xs text-gray-500">Generated {new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Parcels</p>
            <p className="text-2xl font-bold tabular-nums">{totalParcels}</p>
          </div>
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Weight</p>
            <p className="text-2xl font-bold tabular-nums">{totalWeight.toFixed(2)} kg</p>
          </div>
        </div>
      </div>

      <DispatchDateControls date={date} basePath="/ecommerce/dispatch/final-list" />

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#16202E]" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Parcels</p>
          <p className="text-3xl font-bold tabular-nums text-[#16202E]">{totalParcels}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#BFD732]" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Weight</p>
          <p className="text-3xl font-bold tabular-nums text-[#16202E]">{totalWeight.toFixed(2)} kg</p>
        </div>
      </div>

      {parcels.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center print:hidden">
          <p className="text-3xl mb-3">⚖️</p>
          <p className="text-sm font-medium text-gray-500">No parcels weight-verified on this date</p>
          <p className="text-xs text-gray-400 mt-1">Use Weight Verification first, then generate this list</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm print:text-[11px] print:table-fixed">
              <colgroup className="hidden print:table-column-group">
                <col className="print:w-[10%]" />
                <col className="print:w-[24%]" />
                <col className="print:w-[16%]" />
                <col className="print:w-[30%]" />
                <col className="print:w-[20%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium text-left bg-gray-50 print:bg-white print:border-b-2 print:border-black print:text-black">
                  <th className="py-2.5 px-4 print:px-1.5">#</th>
                  <th className="py-2.5 px-3 print:px-1.5">Order</th>
                  <th className="py-2.5 px-3 print:px-1.5">Customer</th>
                  <th className="py-2.5 px-3 print:px-1.5">Tracking</th>
                  <th className="py-2.5 px-4 text-right print:px-1.5">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                {parcels.map((p, i) => (
                  <tr key={p.trackingNumber} className={i % 2 === 1 ? "print:bg-gray-50" : ""}>
                    <td className="py-2.5 px-4 print:px-1.5 print:py-1 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="py-2.5 px-3 print:px-1.5 print:py-1 font-semibold text-gray-900">{p.order ? `#${p.order.id}` : "—"}</td>
                    <td className="py-2.5 px-3 print:px-1.5 print:py-1 text-gray-700">{p.order?.customerName ?? "—"}</td>
                    <td className="py-2.5 px-3 print:px-1.5 print:py-1 font-mono text-xs print:text-[10px] text-gray-600 print:truncate">{p.trackingNumber}</td>
                    <td className="py-2.5 px-4 print:px-1.5 print:py-1 text-right font-semibold tabular-nums text-gray-900">{p.weight.toFixed(2)} kg</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold print:bg-white print:border-black">
                  <td className="py-3 px-4" colSpan={4}>Total ({totalParcels} parcels)</td>
                  <td className="py-3 px-4 text-right tabular-nums">{totalWeight.toFixed(2)} kg</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
