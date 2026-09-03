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
  searchParams: Promise<{ date?: string; print?: string; ids?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { date: dateParam, print, ids: idsParam } = await searchParams;
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const date = dateParam ?? todayPK;

  const selectedIds = idsParam ? idsParam.split(",").map(Number).filter((n) => !Number.isNaN(n)) : null;

  const dayStart = new Date(`${date}T00:00:00+05:00`);
  const dayEnd = new Date(`${date}T23:59:59+05:00`);

  // Refuse to generate the list until every order booked on Postex on the
  // relevant day(s) has actually been packed — not just the ones ticked —
  // otherwise a missed, unselected parcel could slip through the gate
  // unnoticed. In ids mode the "relevant day(s)" are whichever dispatch
  // dates the selected orders belong to.
  let pendingPack: { id: number; customerName: string; trackingNumber: string | null; notes: string | null }[];
  if (selectedIds) {
    const selectedOrders = await prisma.ecomOrder.findMany({
      where: { id: { in: selectedIds } },
      select: { dispatchedAt: true },
    });
    const dayRanges = Array.from(
      new Set(selectedOrders.filter((o) => o.dispatchedAt).map((o) => o.dispatchedAt!.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" })))
    ).map((d) => ({ gte: new Date(`${d}T00:00:00+05:00`), lte: new Date(`${d}T23:59:59+05:00`) }));

    pendingPack = dayRanges.length
      ? await prisma.ecomOrder.findMany({
          where: { OR: dayRanges.map((r) => ({ dispatchedAt: r })), packedAt: null },
          select: { id: true, customerName: true, trackingNumber: true, notes: true },
          orderBy: { dispatchedAt: "asc" },
        })
      : [];
  } else {
    pendingPack = await prisma.ecomOrder.findMany({
      where: { dispatchedAt: { gte: dayStart, lte: dayEnd }, packedAt: null },
      select: { id: true, customerName: true, trackingNumber: true, notes: true },
      orderBy: { dispatchedAt: "asc" },
    });
  }

  // Only parcels that have actually been through Scan & Weigh (packed) go on
  // the dispatch list — this is the gate-verification sheet, keyed off the
  // day they were packed, not the day they were dispatched to the courier.
  // A specific `ids` selection (from the Confirm Orders checkboxes) overrides
  // the date filter and shows exactly those (packed) orders instead.
  const orders = await prisma.ecomOrder.findMany({
    where: selectedIds ? { id: { in: selectedIds }, packedAt: { not: null } } : { packedAt: { gte: dayStart, lte: dayEnd } },
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
    orderBy: { packedAt: "desc" },
  });

  // Weight is only known once a parcel has been through Scan & Weigh — join
  // in the latest verification for each tracking number, if any.
  const trackingNumbers = orders.map((o) => o.trackingNumber).filter((t): t is string => !!t);
  const verifications = trackingNumbers.length
    ? await prisma.weightVerification.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
        orderBy: { createdAt: "asc" },
        select: { trackingNumber: true, weight: true },
      })
    : [];
  const weightByTracking = new Map<string, number>();
  for (const v of verifications) weightByTracking.set(v.trackingNumber, v.weight);

  const totalParcels = orders.length;
  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const returned = orders.filter((o) => o.returned).length;
  const weighedCount = orders.filter((o) => o.trackingNumber && weightByTracking.has(o.trackingNumber)).length;
  const totalWeight = orders.reduce((s, o) => s + (o.trackingNumber ? weightByTracking.get(o.trackingNumber) ?? 0 : 0), 0);
  const showWeight = weighedCount > 0;

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const blocked = pendingPack.length > 0;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {print === "1" && !blocked && <AutoPrint />}
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm print:hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dispatch List</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Print-only letterhead + stat summary */}
      <div className="hidden print:block">
        <div className="flex items-end justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <p className="text-xl font-bold tracking-tight">The Boundary Shop</p>
            <p className="text-sm text-gray-600 mt-0.5">Dispatch List{showWeight ? " — Gate Verification" : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{dateLabel}</p>
            <p className="text-xs text-gray-500">Generated {new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </div>

        <div className={`grid gap-3 mb-5 ${showWeight ? "grid-cols-4" : "grid-cols-3"}`}>
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Number of Parcels</p>
            <p className="text-2xl font-bold tabular-nums">{totalParcels}</p>
          </div>
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Value</p>
            <p className="text-2xl font-bold tabular-nums">Rs {fmt(totalValue)}</p>
          </div>
          {showWeight && (
            <div className="border border-black rounded-md px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Weight</p>
              <p className="text-2xl font-bold tabular-nums">{totalWeight.toFixed(2)} kg</p>
            </div>
          )}
          <div className="border border-black rounded-md px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Returned</p>
            <p className="text-2xl font-bold tabular-nums">{returned}</p>
          </div>
        </div>
      </div>

      <DispatchDateControls date={date} basePath="/ecommerce/dispatch/sheet" />

      {blocked ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 print:hidden">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-red-600"><path d="M10 6.5v4M10 13.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M8.6 3.3 1.9 15a1.5 1.5 0 0 0 1.3 2.25h13.6A1.5 1.5 0 0 0 18.1 15L11.4 3.3a1.5 1.5 0 0 0-2.8 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Dispatch List not ready — {pendingPack.length} parcel{pendingPack.length > 1 ? "s" : ""} not packed yet</p>
              <p className="text-xs text-red-600 mt-1">
                Every order booked on Postex for that day must be through Scan &amp; Weigh before the gate-verification list can be generated — even ones you didn&apos;t select. Missing:
              </p>
              <ul className="mt-3 space-y-1.5">
                {pendingPack.map((o) => (
                  <li key={o.id} className="text-xs text-red-700 bg-white border border-red-100 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="font-medium">{o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`} — {o.customerName}</span>
                    <span className="font-mono text-red-400">{o.trackingNumber ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
      <>
      <div className={`grid grid-cols-2 gap-3 print:hidden ${showWeight ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
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
        {showWeight && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Weight ({weighedCount}/{totalParcels} weighed)</p>
            <p className="text-3xl font-bold tabular-nums text-[#16202E]">{totalWeight.toFixed(2)} kg</p>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-400" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Returned</p>
          <p className="text-3xl font-bold tabular-nums text-[#16202E]">{returned}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center print:hidden">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-sm font-medium text-gray-500">No parcels packed on this date</p>
          <p className="text-xs text-gray-400 mt-1">Try a different date</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm print:text-[10px] print:table-fixed">
              <colgroup className="hidden print:table-column-group">
                <col className="print:w-[8%]" />
                <col className="print:w-[17%]" />
                <col className="print:w-[10%]" />
                <col className="print:w-[25%]" />
                <col className="print:w-[16%]" />
                {showWeight && <col className="print:w-[10%]" />}
                <col className="print:w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium text-left bg-gray-50 print:bg-white print:border-b-2 print:border-black print:text-black">
                  <th className="py-2.5 px-4 print:px-1.5 print:py-1.5">Order</th>
                  <th className="py-2.5 px-3 print:px-1.5">Customer</th>
                  <th className="py-2.5 px-3 print:px-1.5">City</th>
                  <th className="py-2.5 px-3 print:px-1.5">Items</th>
                  <th className="py-2.5 px-3 print:px-1.5">Tracking</th>
                  {showWeight && <th className="py-2.5 px-3 text-right print:px-1.5">Weight</th>}
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
                    {showWeight && (
                      <td className="py-2.5 px-3 print:px-1.5 print:py-1 text-right tabular-nums text-gray-700">
                        {o.trackingNumber && weightByTracking.has(o.trackingNumber) ? `${weightByTracking.get(o.trackingNumber)!.toFixed(2)} kg` : "—"}
                      </td>
                    )}
                    <td className="py-2.5 px-4 print:px-1.5 print:py-1 text-right font-semibold text-gray-900 tabular-nums">Rs {fmt(o.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold print:bg-white print:border-black">
                  <td className="py-3 px-4" colSpan={5}>Total ({totalParcels} parcels)</td>
                  {showWeight && <td className="py-3 px-3 text-right tabular-nums">{totalWeight.toFixed(2)} kg</td>}
                  <td className="py-3 px-4 text-right tabular-nums">Rs {fmt(totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
