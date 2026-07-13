import { prisma } from "@/lib/prisma";
import {
  AmountVisibilityProvider,
  AmountToggleButton,
  Amount,
} from "@/components/AmountVisibility";
import Link from "next/link";
import {
  ProductQtyChart,
  ProductProfitChart,
  ProductRevenueChart,
  type ProductChartData,
} from "@/components/FinanceCharts";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromRaw, to: toRaw } = await searchParams;
  const from = fromRaw || startOfMonth();
  const to = toRaw || today();

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);

  const [products, orders] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.order.findMany({
      where: { confirmed: true, date: { gte: fromDate, lte: toDate } },
      include: {
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { date: "desc" },
    }),
  ]);

  // ── Product-wise breakdown ─────────────────────────────────────
  type ProductStat = {
    id: number | null;
    name: string;
    cost: number | null;  // cost per unit
    qty: number;
    revenue: number;
    totalCost: number;
    profit: number;
  };

  const productMap = new Map<string, ProductStat>();

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId ? `p_${item.productId}` : `d_${item.description}`;
      const existing = productMap.get(key) ?? {
        id: item.productId ?? null,
        name: item.product?.name ?? item.description,
        cost: item.product?.cost ?? null,
        qty: 0,
        revenue: 0,
        totalCost: 0,
        profit: 0,
      };
      const lineRevenue = item.quantity * item.rate;
      const lineCost = item.product?.cost != null ? item.quantity * item.product.cost : 0;
      existing.qty += item.quantity;
      existing.revenue += lineRevenue;
      existing.totalCost += lineCost;
      existing.profit += item.product?.cost != null ? lineRevenue - lineCost : 0;
      productMap.set(key, existing);
    }
  }

  const productStats = [...productMap.values()].sort((a, b) => b.revenue - a.revenue);

  const chartData: ProductChartData[] = productStats.map((p) => ({
    name: p.name,
    qty: p.qty,
    revenue: p.revenue,
    profit: p.cost != null ? p.profit : null,
    hasCost: p.cost != null,
  }));

  // ── Summary ────────────────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + o.saleAmount, 0);
  const totalReceived = orders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const totalPending = totalRevenue - totalReceived;

  // Only products with cost set contribute to cost/profit calculation
  const totalCost = productStats.reduce((s, p) => s + p.totalCost, 0);
  const totalProfit = productStats
    .filter((p) => p.cost != null)
    .reduce((s, p) => s + p.profit, 0);
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Products with no cost set — flagged for user
  const productsWithoutCost = products.filter((p) => p.cost == null);

  return (
    <AmountVisibilityProvider>
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Revenue, cost, and profit from confirmed orders.
            </p>
          </div>
          <AmountToggleButton />
        </div>

        {/* Date filter */}
        <form method="GET" className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">From</label>
            <input type="date" name="from" defaultValue={from}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">To</label>
            <input type="date" name="to" defaultValue={to}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
          </div>
          <button type="submit" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
            Apply
          </button>
        </form>

        {/* Warning: products without cost */}
        {productsWithoutCost.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>
              <strong>{productsWithoutCost.map(p => p.name).join(", ")}</strong> — cost not set, excluded from profit calculations.{" "}
              <Link href="/sales/products" className="underline font-medium">Set cost on Products page →</Link>
            </span>
          </div>
        )}

        {/* KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Confirmed Orders" value={orders.length} />
          <StatCard label="Total Revenue" value={<Amount value={"Rs " + fmt(totalRevenue)} />} />
          <StatCard label="Total Cost" value={<Amount value={"Rs " + fmt(totalCost)} />} />
          <StatCard
            label={`Net Profit (${margin.toFixed(1)}% margin)`}
            value={<Amount value={"Rs " + fmt(totalProfit)} />}
            dark={totalProfit > 0}
            red={totalProfit < 0}
          />
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Received</p>
            <p className="text-xl font-semibold"><Amount value={"Rs " + fmt(totalReceived)} /></p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-900 rounded-full" style={{ width: totalRevenue > 0 ? `${Math.min(100, (totalReceived / totalRevenue) * 100)}%` : "0%" }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{totalRevenue > 0 ? ((totalReceived / totalRevenue) * 100).toFixed(0) : 0}% collected</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Pending Recovery</p>
            <p className="text-xl font-semibold text-orange-600"><Amount value={"Rs " + fmt(totalPending)} /></p>
            <p className="text-xs text-gray-400 mt-2">{orders.filter(o => o.paymentStatus !== "PAID").length} invoices unpaid/partial</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Best Selling Product</p>
            {productStats.length > 0 ? (
              <>
                <p className="text-base font-semibold mt-1 truncate">{productStats[0].name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {productStats[0].qty.toLocaleString()} units · <Amount value={"Rs " + fmt(productStats[0].revenue)} />
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No data</p>
            )}
          </div>
        </div>

        {/* Charts */}
        {productStats.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Product Charts</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Units Sold per Product</p>
                <ProductQtyChart data={chartData} />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Revenue per Product</p>
                <ProductRevenueChart data={chartData} />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Profit per Product</p>
                <ProductProfitChart data={chartData} />
              </div>
            </div>
          </div>
        )}

        {/* Product-wise table */}
        <div>
          <h2 className="text-base font-semibold mb-3 text-gray-800">Product-wise Breakdown</h2>
          {productStats.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No orders in this period.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                    <th className="py-3 px-5">Product</th>
                    <th className="py-3 px-5 text-right">Qty Sold</th>
                    <th className="py-3 px-5 text-right">Cost/Unit</th>
                    <th className="py-3 px-5 text-right">Total Cost</th>
                    <th className="py-3 px-5 text-right">Revenue</th>
                    <th className="py-3 px-5 text-right">Profit</th>
                    <th className="py-3 px-5 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {productStats.map((p, i) => {
                    const pMargin = p.revenue > 0 && p.cost != null ? (p.profit / p.revenue) * 100 : null;
                    return (
                      <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-5 font-medium">
                          {p.name}
                          {p.cost == null && (
                            <span className="ml-2 text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded">cost missing</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums text-gray-600">
                          {p.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums text-gray-500">
                          {p.cost != null ? <Amount value={"Rs " + fmt(p.cost)} /> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums text-gray-600">
                          {p.cost != null ? <Amount value={"Rs " + fmt(p.totalCost)} /> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums font-medium">
                          <Amount value={"Rs " + fmt(p.revenue)} />
                        </td>
                        <td className={`py-3 px-5 text-right tabular-nums font-medium ${p.profit < 0 ? "text-red-600" : p.profit > 0 ? "text-green-700" : ""}`}>
                          {p.cost != null ? <Amount value={"Rs " + fmt(p.profit)} /> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums text-gray-500">
                          {pMargin != null ? `${pMargin.toFixed(1)}%` : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td className="py-3 px-5">Total</td>
                    <td className="py-3 px-5 text-right tabular-nums"></td>
                    <td className="py-3 px-5"></td>
                    <td className="py-3 px-5 text-right tabular-nums"><Amount value={"Rs " + fmt(totalCost)} /></td>
                    <td className="py-3 px-5 text-right tabular-nums"><Amount value={"Rs " + fmt(totalRevenue)} /></td>
                    <td className={`py-3 px-5 text-right tabular-nums ${totalProfit < 0 ? "text-red-600" : "text-green-700"}`}>
                      <Amount value={"Rs " + fmt(totalProfit)} />
                    </td>
                    <td className="py-3 px-5 text-right tabular-nums text-gray-600">{margin.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Order-level table */}
        {orders.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3 text-gray-800">Order Detail</h2>
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Invoice</th>
                    <th className="py-3 px-5">Items</th>
                    <th className="py-3 px-5 text-right">Sale</th>
                    <th className="py-3 px-5 text-right">Received</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((o) => {
                    const received = o.payments.reduce((s, p) => s + p.amount, 0);
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-5 text-gray-500">{o.date.toISOString().slice(0, 10)}</td>
                        <td className="py-3 px-5 font-medium">
                          <Link href={`/clients/${o.clientId}/orders/${o.id}`} className="hover:underline">
                            INV-{String(o.id).padStart(4, "0")}
                          </Link>
                        </td>
                        <td className="py-3 px-5 text-gray-500 text-xs">
                          {o.items.map(i => i.product?.name ?? i.description).join(", ")}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums"><Amount value={"Rs " + fmt(o.saleAmount)} /></td>
                        <td className="py-3 px-5 text-right tabular-nums text-gray-600"><Amount value={"Rs " + fmt(received)} /></td>
                        <td className="py-3 px-5 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            o.paymentStatus === "PAID" ? "bg-green-100 text-green-700" :
                            o.paymentStatus === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AmountVisibilityProvider>
  );
}

function StatCard({ label, value, dark, red }: { label: string; value: React.ReactNode; dark?: boolean; red?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${
      dark ? "bg-zinc-900 text-white border-zinc-900" :
      red ? "bg-red-50 text-red-700 border-red-100" :
      "bg-white text-black border-gray-200"
    }`}>
      <p className={`text-xs ${dark ? "text-zinc-400" : red ? "text-red-500" : "text-gray-500"}`}>{label}</p>
      <p className="text-xl font-semibold mt-2 tracking-tight">{value}</p>
    </div>
  );
}
