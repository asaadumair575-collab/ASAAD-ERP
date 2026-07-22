import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const { from, to, status } = await searchParams;

  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  // Normal orders (never includes RETURNED)
  const orders = await prisma.retailOrder.findMany({
    where: {
      status: status && status !== "RETURNED" ? status : { not: "RETURNED" },
      ...(fromDate || toDate
        ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
        : {}),
    },
    include: { payments: true, items: true },
    orderBy: { date: "desc" },
  });

  // Returned orders — always ALL, no date/status filter
  const returnedOrders = await prisma.retailOrder.findMany({
    where: { status: "RETURNED" },
    orderBy: { date: "desc" },
  });

  const COST_PER_DOZEN = 1550;
  const normalOrders = orders;

  // Return losses: only when delivery cost > advance (else no profit no loss)
  const totalReturnLoss = returnedOrders.reduce((s, o) => {
    const loss = (o.returnDeliveryCost ?? 0) - (o.deliveryCharge ?? 0);
    return s + (loss > 0 ? loss : 0);
  }, 0);

  // KPIs — normal orders only
  const totalRevenue = normalOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalAdvance = normalOrders.reduce((s, o) => s + (o.deliveryCharge ?? 0), 0);
  const totalCogs = normalOrders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity * COST_PER_DOZEN, 0),
    0
  );
  const totalCourier = normalOrders.reduce((s, o) => s + (o.courierCharge ?? 0), 0);
  const totalProfit = totalRevenue - totalCogs - totalCourier;

  // Settled profit: only orders where courier charge entered AND payment recorded
  const settledOrders = normalOrders.filter(
    (o) => (o.courierCharge ?? 0) > 0 && o.payments.length > 0
  );
  const settledRevenue = settledOrders.reduce((s, o) => s + o.totalAmount, 0);
  const settledCogs = settledOrders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity * COST_PER_DOZEN, 0),
    0
  );
  const settledCourier = settledOrders.reduce((s, o) => s + (o.courierCharge ?? 0), 0);
  const settledProfit = settledRevenue - settledCogs - settledCourier - totalReturnLoss;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Retail Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Profit = Revenue − Ball Cost (Rs 1,550/doz) − Postex Charges</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="date"
          name="from"
          defaultValue={from ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          name="to"
          defaultValue={to ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All orders</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PENDING">Unpaid</option>
          <option value="RETURNED">Returned</option>
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Apply
        </button>
        {(from || to || status) && (
          <Link href="/retail/finance" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
        )}
      </form>

      {/* Profit KPI — prominent */}
      <div className={`rounded-2xl p-6 shadow-sm border ${settledProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Net Profit</p>
        <p className={`text-4xl font-bold tracking-tight ${settledProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
          Rs {fmt(settledProfit)}
        </p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <span>Revenue <span className="font-semibold text-gray-800">Rs {fmt(settledRevenue)}</span></span>
          <span>− Ball Cost <span className="font-semibold text-gray-800">Rs {fmt(settledCogs)}</span></span>
          <span>− Courier <span className="font-semibold text-gray-800">Rs {fmt(settledCourier)}</span></span>
          <span className="text-gray-400">({settledOrders.length} settled orders)</span>
        </div>
      </div>

      {/* Return losses card */}
      {returnedOrders.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-red-700 mb-1">Returns ({returnedOrders.length})</p>
            <p className="text-2xl font-bold text-red-600">
              {totalReturnLoss > 0 ? `− Rs ${fmt(totalReturnLoss)}` : "No Loss"}
            </p>
            <p className="text-xs text-red-400 mt-0.5">
              {totalReturnLoss > 0
                ? "Return delivery cost jo advance se zyada tha"
                : "Advance ne delivery cost cover kar liya"}
            </p>
          </div>
          <div className="space-y-0.5 text-sm">
            {returnedOrders.map((o) => {
              const net = (o.deliveryCharge ?? 0) - (o.returnDeliveryCost ?? 0);
              return (
                <div key={o.id} className="flex gap-3 items-center">
                  <a href={`/retail/orders/${o.id}`} className="text-red-700 hover:underline font-medium text-xs">
                    R-{String(o.id).padStart(3, "0")}
                  </a>
                  <span className="text-xs text-gray-600">{o.customerName}</span>
                  {net >= 0 ? (
                    <span className="text-xs text-gray-500">No Profit / No Loss</span>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">Loss Rs {fmt(Math.abs(net))}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Revenue</p>
          <p className="text-xl font-bold tracking-tight">Rs {fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Advance Received</p>
          <p className="text-xl font-bold tracking-tight text-green-700">Rs {fmt(totalAdvance)}</p>
          <p className="text-xs text-gray-400 mt-0.5">collected at dispatch</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ball Cost</p>
          <p className="text-xl font-bold tracking-tight text-gray-700">Rs {fmt(totalCogs)}</p>
          <p className="text-xs text-gray-400 mt-0.5">@ Rs 1,550/doz</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Postex Charges</p>
          <p className="text-xl font-bold tracking-tight text-blue-700">Rs {fmt(totalCourier)}</p>
          <p className="text-xs text-gray-400 mt-0.5">delivery deducted</p>
        </div>
      </div>

      {/* Per-order breakdown */}
      {normalOrders.length > 0 && (
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
                  <th className="py-2 px-4 text-right">Received</th>
                  <th className="py-2 px-4 text-right">Balance</th>
                  <th className="py-2 px-4 text-right">Ball Cost</th>
                  <th className="py-2 px-4 text-right">Courier</th>
                  <th className="py-2 px-4 text-right">Profit</th>
                  <th className="py-2 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {normalOrders.map((o) => {
                  const received = o.payments.reduce((s, p) => s + p.amount, 0);
                  const balance = Math.max(0, o.totalAmount - received);
                  const cogs = o.items.reduce((s, i) => s + i.quantity * COST_PER_DOZEN, 0);
                  const courier = o.courierCharge ?? 0;
                  const profit = o.totalAmount - cogs - courier;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/retail/orders/${o.id}`} className="font-medium hover:underline text-gray-700">
                          R-{String(o.id).padStart(3, "0")}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{o.customerName}</p>
                        {o.city && <p className="text-xs text-gray-400">{o.city}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{o.date.toISOString().slice(0, 10)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-green-700">Rs {fmt(received)}</td>
                      <td className={`py-3 px-4 text-right tabular-nums font-medium ${balance > 0 ? "text-orange-600" : "text-green-700"}`}>
                        {balance > 0 ? `Rs ${fmt(balance)}` : "✓"}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-gray-500">
                        {cogs > 0 ? `Rs ${fmt(cogs)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-blue-700">
                        {courier > 0 ? `Rs ${fmt(courier)}` : "—"}
                      </td>
                      <td className={`py-3 px-4 text-right tabular-nums font-semibold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {cogs > 0 || courier > 0 ? `Rs ${fmt(profit)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          o.status === "PAID" ? "bg-green-100 text-green-700" :
                          o.status === "RETURNED" ? "bg-red-100 text-red-700" :
                          o.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {o.status === "PAID" ? "Delivered" : o.status === "RETURNED" ? "Returned" : o.status === "PARTIAL" ? "Partial" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                  <td className="py-3 px-4" colSpan={3}>Total</td>
                  <td className="py-3 px-4 text-right tabular-nums">Rs {fmt(totalRevenue)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-green-700">Rs {fmt(normalOrders.reduce((s,o)=>s+o.payments.reduce((ps,p)=>ps+p.amount,0),0))}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-orange-600">Rs {fmt(Math.max(0,totalRevenue-normalOrders.reduce((s,o)=>s+o.payments.reduce((ps,p)=>ps+p.amount,0),0)))}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-gray-500">Rs {fmt(totalCogs)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-blue-700">Rs {fmt(totalCourier)}</td>
                  <td className={`py-3 px-4 text-right tabular-nums ${totalProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    Rs {fmt(totalProfit)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No orders found for this date range.</p>
          <Link href="/retail/orders/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">
            + Create your first order
          </Link>
        </div>
      )}
    </div>
  );
}
