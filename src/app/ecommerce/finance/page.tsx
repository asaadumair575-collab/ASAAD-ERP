import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

const BALL_COST_PER_DOZ = 1450;

export default async function EcomFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; agency?: string; other?: string }>;
}) {
  const { from, to, agency, other } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;
  const agencyTotal = parseFloat(agency ?? "0") || 0;
  const otherTotal = parseFloat(other ?? "0") || 0;

  const orders = await prisma.ecomOrder.findMany({
    where: {
      ...(fromDate || toDate
        ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
        : {}),
    },
    include: { items: true, payments: true },
    orderBy: { date: "desc" },
  });

  const orderCount = orders.length;
  const agencyPerOrder = orderCount > 0 ? agencyTotal / orderCount : 0;
  const otherPerOrder = orderCount > 0 ? otherTotal / orderCount : 0;

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalBallCost = orders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0) * BALL_COST_PER_DOZ,
    0
  );
  const totalShipping = orders.reduce((s, o) => s + o.shippingCost, 0);
  const totalAd = orders.reduce((s, o) => s + o.adCost, 0);
  const totalPackaging = orders.reduce((s, o) => s + o.packagingCost, 0);
  const totalReturn = orders.reduce((s, o) => s + o.returnCost, 0);
  const totalGrossProfit = totalRevenue - totalBallCost - totalShipping - totalAd - totalPackaging - totalReturn;
  const totalNetProfit = totalGrossProfit - agencyTotal - otherTotal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ecommerce Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ball Cost: Rs 1,450/doz · Shared expenses divided equally across orders in range
        </p>
      </div>

      <form
        method="GET"
        className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5"
      >
        <input type="date" name="from" defaultValue={from ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" name="to" defaultValue={to ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Agency Commission:</label>
          <input type="number" name="agency" step="1" min="0" defaultValue={agency ?? ""} placeholder="0" className="w-28 bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Other Expenses:</label>
          <input type="number" name="other" step="1" min="0" defaultValue={other ?? ""} placeholder="0" className="w-28 bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Apply</button>
        {(from || to) && <Link href="/ecommerce/finance" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>}
      </form>

      <div className={`rounded-2xl p-6 shadow-sm border ${totalNetProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Net Profit</p>
        <p className={`text-4xl font-bold tracking-tight ${totalNetProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(totalNetProfit)}</p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <span>Revenue <span className="font-semibold text-gray-800">Rs {fmt(totalRevenue)}</span></span>
          <span>− Ball Cost <span className="font-semibold text-gray-800">Rs {fmt(totalBallCost)}</span></span>
          <span>− Shipping <span className="font-semibold text-gray-800">Rs {fmt(totalShipping)}</span></span>
          <span>− Ads <span className="font-semibold text-gray-800">Rs {fmt(totalAd)}</span></span>
          <span>− Packaging <span className="font-semibold text-gray-800">Rs {fmt(totalPackaging)}</span></span>
          {totalReturn > 0 && <span>− Returns <span className="font-semibold text-gray-800">Rs {fmt(totalReturn)}</span></span>}
          {agencyTotal > 0 && <span>− Agency <span className="font-semibold text-gray-800">Rs {fmt(agencyTotal)}</span></span>}
          {otherTotal > 0 && <span>− Other <span className="font-semibold text-gray-800">Rs {fmt(otherTotal)}</span></span>}
          <span className="text-gray-400">({orderCount} orders)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Revenue</p>
          <p className="text-xl font-bold tracking-tight">Rs {fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{orderCount} orders</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ball Cost</p>
          <p className="text-xl font-bold tracking-tight text-gray-700">Rs {fmt(totalBallCost)}</p>
          <p className="text-xs text-gray-400 mt-0.5">@ Rs 1,450/doz</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm border ${totalGrossProfit >= 0 ? "bg-white border-gray-200" : "bg-red-50 border-red-100"}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gross Profit</p>
          <p className={`text-xl font-bold tracking-tight ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(totalGrossProfit)}</p>
          <p className="text-xs text-gray-400 mt-0.5">before shared expenses</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Shared Expenses</p>
          <p className="text-xl font-bold tracking-tight text-orange-600">Rs {fmt(agencyTotal + otherTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">÷ {orderCount} = Rs {fmt(agencyPerOrder + otherPerOrder)}/order</p>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="py-2 px-4">#</th>
                  <th className="py-2 px-4">Customer</th>
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4 text-right">Revenue</th>
                  <th className="py-2 px-4 text-right">Ball Cost</th>
                  <th className="py-2 px-4 text-right">Shipping</th>
                  <th className="py-2 px-4 text-right">Ad</th>
                  <th className="py-2 px-4 text-right">Pack</th>
                  <th className="py-2 px-4 text-right">Return</th>
                  <th className="py-2 px-4 text-right">Gross P.</th>
                  {agencyTotal > 0 && <th className="py-2 px-4 text-right">Agency</th>}
                  {otherTotal > 0 && <th className="py-2 px-4 text-right">Other</th>}
                  <th className="py-2 px-4 text-right">Net P.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const dozens = o.items.reduce((s, i) => s + i.quantity, 0);
                  const ballCost = dozens * BALL_COST_PER_DOZ;
                  const grossProfit = o.totalAmount - ballCost - o.shippingCost - o.adCost - o.packagingCost - o.returnCost;
                  const netProfit = grossProfit - agencyPerOrder - otherPerOrder;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/ecommerce/orders/${o.id}`} className="font-medium hover:underline text-gray-700">E-{String(o.id).padStart(3, "0")}</Link>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{o.customerName}</p>
                        {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{o.date.toISOString().slice(0, 10)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-gray-500">{ballCost > 0 ? `Rs ${fmt(ballCost)}` : "—"}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-blue-600">{o.shippingCost > 0 ? `Rs ${fmt(o.shippingCost)}` : "—"}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-purple-600">{o.adCost > 0 ? `Rs ${fmt(o.adCost)}` : "—"}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-orange-500">{o.packagingCost > 0 ? `Rs ${fmt(o.packagingCost)}` : "—"}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-red-500">{o.returnCost > 0 ? `Rs ${fmt(o.returnCost)}` : "—"}</td>
                      <td className={`py-3 px-4 text-right tabular-nums font-semibold ${grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(grossProfit)}</td>
                      {agencyTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-gray-500">Rs {fmt(agencyPerOrder)}</td>}
                      {otherTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-gray-500">Rs {fmt(otherPerOrder)}</td>}
                      <td className={`py-3 px-4 text-right tabular-nums font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(netProfit)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                  <td className="py-3 px-4" colSpan={3}>Total</td>
                  <td className="py-3 px-4 text-right tabular-nums">Rs {fmt(totalRevenue)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-gray-500">Rs {fmt(totalBallCost)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-blue-600">Rs {fmt(totalShipping)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-purple-600">Rs {fmt(totalAd)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-orange-500">Rs {fmt(totalPackaging)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-red-500">Rs {fmt(totalReturn)}</td>
                  <td className={`py-3 px-4 text-right tabular-nums ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(totalGrossProfit)}</td>
                  {agencyTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-gray-500">Rs {fmt(agencyTotal)}</td>}
                  {otherTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-gray-500">Rs {fmt(otherTotal)}</td>}
                  <td className={`py-3 px-4 text-right tabular-nums ${totalNetProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(totalNetProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No orders found for this date range.</p>
          <Link href="/ecommerce/orders/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">+ Create your first order</Link>
        </div>
      )}
    </div>
  );
}
