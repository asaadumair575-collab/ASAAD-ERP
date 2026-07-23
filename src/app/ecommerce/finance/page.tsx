import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

const BALL_COST_PER_DOZ = 1450;
const PACKAGING_COST = 15;

export default async function EcomFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const dateFilter = fromDate || toDate
    ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
    : {};

  const [orders, expenses] = await Promise.all([
    prisma.ecomOrder.findMany({
      where: dateFilter,
      include: { items: true, payments: true },
      orderBy: { date: "desc" },
    }),
    prisma.ecomExpense.findMany({
      where: dateFilter,
      orderBy: { date: "desc" },
    }),
  ]);

  const orderCount = orders.length;

  // Expense totals by category
  const expByCategory = new Map<string, number>();
  for (const e of expenses) {
    expByCategory.set(e.category, (expByCategory.get(e.category) ?? 0) + e.amount);
  }
  const agencyTotal = expByCategory.get("Agency Commission") ?? 0;
  const adsTotal = expByCategory.get("Ads") ?? 0;
  const shopifyTotal = expByCategory.get("Shopify") ?? 0;
  const otherTotal = expByCategory.get("Other") ?? 0;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const adsPerOrder = orderCount > 0 ? adsTotal / orderCount : 0;
  const agencyPerOrder = orderCount > 0 ? agencyTotal / orderCount : 0;
  const shopifyPerOrder = orderCount > 0 ? shopifyTotal / orderCount : 0;
  const otherPerOrder = orderCount > 0 ? otherTotal / orderCount : 0;
  const expensesPerOrder = orderCount > 0 ? totalExpenses / orderCount : 0;

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalBallCost = orders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0) * BALL_COST_PER_DOZ,
    0
  );
  const totalShipping = orders.reduce((s, o) => s + o.shippingCost, 0);
  const totalPackaging = orderCount * PACKAGING_COST;
  const totalReturn = orders.reduce((s, o) => s + o.returnCost, 0);
  const totalGrossProfit = totalRevenue - totalBallCost - totalShipping - totalPackaging - totalReturn;
  const totalNetProfit = totalGrossProfit - totalExpenses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ecommerce Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ball Cost: Rs 1,450/doz · Packaging: Rs 15/order · Expenses from{" "}
          <Link href="/ecommerce/expenses" className="underline hover:text-black">Expenses log</Link>{" "}
          divided across orders
        </p>
      </div>

      <form
        method="GET"
        className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5"
      >
        <input type="date" name="from" defaultValue={from ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" name="to" defaultValue={to ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Apply</button>
        {(from || to) && <Link href="/ecommerce/finance" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>}
      </form>

      {/* Net Profit hero */}
      <div className={`rounded-2xl p-6 shadow-sm border ${totalNetProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Net Profit</p>
        <p className={`text-4xl font-bold tracking-tight ${totalNetProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(totalNetProfit)}</p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <span>Revenue <span className="font-semibold text-gray-800">Rs {fmt(totalRevenue)}</span></span>
          <span>− Ball Cost <span className="font-semibold text-gray-800">Rs {fmt(totalBallCost)}</span></span>
          <span>− Shipping <span className="font-semibold text-gray-800">Rs {fmt(totalShipping)}</span></span>
          <span>− Packaging <span className="font-semibold text-gray-800">Rs {fmt(totalPackaging)}</span></span>
          {totalReturn > 0 && <span>− Returns <span className="font-semibold text-gray-800">Rs {fmt(totalReturn)}</span></span>}
          {totalExpenses > 0 && <span>− Expenses <span className="font-semibold text-gray-800">Rs {fmt(totalExpenses)}</span></span>}
          <span className="text-gray-400">({orderCount} orders)</span>
        </div>
      </div>

      {/* KPI cards */}
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
          <p className="text-xs text-gray-400 mt-0.5">before expenses</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Expenses</p>
          <p className="text-xl font-bold tracking-tight text-orange-600">Rs {fmt(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-0.5">÷ {orderCount} = Rs {fmt(expensesPerOrder)}/order</p>
        </div>
      </div>

      {/* Expense breakdown by category */}
      {expenses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Expense Breakdown</p>
          <div className="flex flex-wrap gap-3">
            {agencyTotal > 0 && (
              <div className="bg-blue-50 rounded-xl px-4 py-2 text-sm">
                <span className="text-blue-600 font-medium">Agency Commission</span>
                <span className="ml-2 font-semibold text-gray-800">Rs {fmt(agencyTotal)}</span>
              </div>
            )}
            {adsTotal > 0 && (
              <div className="bg-purple-50 rounded-xl px-4 py-2 text-sm">
                <span className="text-purple-600 font-medium">Ads</span>
                <span className="ml-2 font-semibold text-gray-800">Rs {fmt(adsTotal)}</span>
              </div>
            )}
            {shopifyTotal > 0 && (
              <div className="bg-green-50 rounded-xl px-4 py-2 text-sm">
                <span className="text-green-600 font-medium">Shopify</span>
                <span className="ml-2 font-semibold text-gray-800">Rs {fmt(shopifyTotal)}</span>
              </div>
            )}
            {otherTotal > 0 && (
              <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm">
                <span className="text-gray-600 font-medium">Other</span>
                <span className="ml-2 font-semibold text-gray-800">Rs {fmt(otherTotal)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order breakdown table */}
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
                  {adsTotal > 0 && <th className="py-2 px-4 text-right">Ads</th>}
                  <th className="py-2 px-4 text-right">Pack</th>
                  <th className="py-2 px-4 text-right">Return</th>
                  <th className="py-2 px-4 text-right">Gross P.</th>
                  {agencyTotal > 0 && <th className="py-2 px-4 text-right">Agency</th>}
                  {shopifyTotal > 0 && <th className="py-2 px-4 text-right">Shopify</th>}
                  {otherTotal > 0 && <th className="py-2 px-4 text-right">Other</th>}
                  <th className="py-2 px-4 text-right">Net P.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const dozens = o.items.reduce((s, i) => s + i.quantity, 0);
                  const ballCost = dozens * BALL_COST_PER_DOZ;
                  const grossProfit = o.totalAmount - ballCost - PACKAGING_COST - o.shippingCost - o.returnCost;
                  const netProfit = grossProfit - adsPerOrder - agencyPerOrder - shopifyPerOrder - otherPerOrder;
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
                      {adsTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-purple-600">Rs {fmt(adsPerOrder)}</td>}
                      <td className="py-3 px-4 text-right tabular-nums text-orange-500">Rs 15</td>
                      <td className="py-3 px-4 text-right tabular-nums text-red-500">{o.returnCost > 0 ? `Rs ${fmt(o.returnCost)}` : "—"}</td>
                      <td className={`py-3 px-4 text-right tabular-nums font-semibold ${grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(grossProfit)}</td>
                      {agencyTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-blue-600">Rs {fmt(agencyPerOrder)}</td>}
                      {shopifyTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-green-600">Rs {fmt(shopifyPerOrder)}</td>}
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
                  {adsTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-purple-600">Rs {fmt(adsTotal)}</td>}
                  <td className="py-3 px-4 text-right tabular-nums text-orange-500">Rs {fmt(totalPackaging)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-red-500">Rs {fmt(totalReturn)}</td>
                  <td className={`py-3 px-4 text-right tabular-nums ${totalGrossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>Rs {fmt(totalGrossProfit)}</td>
                  {agencyTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-blue-600">Rs {fmt(agencyTotal)}</td>}
                  {shopifyTotal > 0 && <td className="py-3 px-4 text-right tabular-nums text-green-600">Rs {fmt(shopifyTotal)}</td>}
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
