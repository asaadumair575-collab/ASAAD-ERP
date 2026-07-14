import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  RetailDailyChart,
  RetailProductChart,
  RetailStatusChart,
  type DailyTrendPoint,
  type ProductRevenuePoint,
  type StatusPoint,
} from "@/components/RetailCharts";

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

export default async function RetailOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromRaw, to: toRaw } = await searchParams;
  const from = fromRaw || startOfMonth();
  const to = toRaw || today();

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);

  const orders = await prisma.retailOrder.findMany({
    where: { date: { gte: fromDate, lte: toDate } },
    include: { payments: true, items: true },
  });

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalReceived = orders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const totalPending = Math.max(0, totalRevenue - totalReceived);
  const pendingDispatch = orders.filter((o) => !o.dispatched).length;
  const paidOrders = orders.filter((o) => o.status === "PAID").length;
  const unpaidOrders = orders.filter((o) => o.status !== "PAID").length;

  // ── Chart data ──────────────────────────────────────────────────
  // Daily billed vs received
  const dayMap = new Map<string, DailyTrendPoint>();
  for (const o of orders) {
    const key = o.date.toISOString().slice(0, 10);
    const rec = o.payments.reduce((s, p) => s + p.amount, 0);
    const existing = dayMap.get(key) ?? { date: key, billed: 0, received: 0 };
    existing.billed += o.totalAmount;
    existing.received += rec;
    dayMap.set(key, existing);
  }
  const dailyData: DailyTrendPoint[] = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Revenue by product
  const prodMap = new Map<string, ProductRevenuePoint>();
  for (const o of orders) {
    for (const item of o.items) {
      const key = item.description;
      const existing = prodMap.get(key) ?? { name: key, revenue: 0, qty: 0 };
      existing.revenue += item.quantity * item.rate;
      existing.qty += item.quantity;
      prodMap.set(key, existing);
    }
  }
  const productData: ProductRevenuePoint[] = Array.from(prodMap.values());

  // Order status breakdown
  const statusData: StatusPoint[] = [
    { label: "Paid", count: paidOrders, color: "#16a34a" },
    { label: "Partial", count: orders.filter((o) => o.status === "PARTIAL").length, color: "#d97706" },
    { label: "Pending", count: orders.filter((o) => o.status === "PENDING").length, color: "#71717a" },
    { label: "Dispatched", count: orders.filter((o) => o.dispatched).length, color: "#2563eb" },
    { label: "Not Dispatched", count: pendingDispatch, color: "#ea580c" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retail / COD</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of COD orders and payments.</p>
        </div>
        <Link
          href="/retail/orders/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Order
        </Link>
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
        {(fromRaw || toRaw) && (
          <Link href="/retail" className="text-sm text-gray-400 hover:text-black">Reset</Link>
        )}
      </form>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Billed</p>
          <p className="text-2xl font-bold tracking-tight">Rs {fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Received</p>
          <p className="text-2xl font-bold tracking-tight text-green-700">Rs {fmt(totalReceived)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{paidOrders} fully paid</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm ${totalPending > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending Recovery</p>
          <p className={`text-2xl font-bold tracking-tight ${totalPending > 0 ? "text-orange-600" : "text-green-700"}`}>
            Rs {fmt(totalPending)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{unpaidOrders} unpaid / partial</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm ${pendingDispatch > 0 ? "bg-blue-50 border border-blue-200" : "bg-green-50 border border-green-200"}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending Dispatch</p>
          <p className={`text-2xl font-bold tracking-tight ${pendingDispatch > 0 ? "text-blue-700" : "text-green-700"}`}>
            {pendingDispatch}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {pendingDispatch > 0 ? `${orders.length - pendingDispatch} dispatched` : "All dispatched ✓"}
          </p>
        </div>
      </div>

      {/* Charts */}
      {orders.length > 0 && (
        <div className="space-y-4">
          {/* Daily trend */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Daily Billed vs Received</p>
            <RetailDailyChart data={dailyData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue by product */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Revenue by Product</p>
              <RetailProductChart data={productData} />
            </div>

            {/* Order & dispatch status */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Order & Dispatch Status</p>
              <RetailStatusChart data={statusData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
