import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  AmountVisibilityProvider,
  AmountToggleButton,
  Amount,
} from "@/components/AmountVisibility";
import {
  SalesBarChart,
  RevenueTrendChart,
  PaymentStatusPie,
  LeadStatusPie,
  CityBarChart,
  type MonthlyStat,
  type CityData,
  type PaymentStatusData,
  type LeadStatusData,
} from "@/components/DashboardCharts";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [clients, leads, orders] = await Promise.all([
    prisma.client.findMany({
      include: { orders: { include: { payments: true } } },
    }),
    prisma.lead.findMany({ select: { status: true } }),
    prisma.order.findMany({
      where: { confirmed: true },
      include: { payments: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // ── Summary stats ──────────────────────────────────────────────
  const totalClients = clients.length;
  const totalOrders = orders.length;
  const totalSale = orders.reduce((s, o) => s + o.saleAmount, 0);
  const totalReceived = orders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const pendingSale = totalSale - totalReceived;

  // ── Monthly sales trend (last 7 months) ───────────────────────
  const monthMap = new Map<string, { sales: number; received: number }>();
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-PK", { month: "short", year: "2-digit" });
    monthMap.set(key, { sales: 0, received: 0 });
  }
  for (const o of orders) {
    const d = new Date(o.date);
    const key = d.toLocaleDateString("en-PK", { month: "short", year: "2-digit" });
    if (monthMap.has(key)) {
      const entry = monthMap.get(key)!;
      entry.sales += o.saleAmount;
      entry.received += o.payments.reduce((s, p) => s + p.amount, 0);
    }
  }
  const monthlyStats: MonthlyStat[] = Array.from(monthMap.entries()).map(
    ([month, v]) => ({ month, ...v })
  );

  // ── Payment status breakdown ───────────────────────────────────
  const statusCounts = { PAID: 0, PARTIAL: 0, UNPAID: 0 };
  for (const o of orders) {
    if (o.paymentStatus === "PAID") statusCounts.PAID++;
    else if (o.paymentStatus === "PARTIAL") statusCounts.PARTIAL++;
    else statusCounts.UNPAID++;
  }
  const paymentStatusData: PaymentStatusData[] = [
    { name: "Paid", value: statusCounts.PAID, color: "#09090b" },
    { name: "Partial", value: statusCounts.PARTIAL, color: "#f59e0b" },
    { name: "Unpaid", value: statusCounts.UNPAID, color: "#e5e7eb" },
  ].filter((d) => d.value > 0);

  // ── Lead status breakdown ──────────────────────────────────────
  const leadCounts = { NEW: 0, CONTACTED: 0, SAMPLE_SENT: 0 };
  for (const l of leads) {
    if (l.status === "NEW") leadCounts.NEW++;
    else if (l.status === "CONTACTED") leadCounts.CONTACTED++;
    else if (l.status === "SAMPLE_SENT") leadCounts.SAMPLE_SENT++;
  }
  const leadStatusData: LeadStatusData[] = [
    { name: "Not Contacted", value: leadCounts.NEW, color: "#e5e7eb" },
    { name: "Contacted", value: leadCounts.CONTACTED, color: "#a1a1aa" },
    { name: "Sample Sent", value: leadCounts.SAMPLE_SENT, color: "#09090b" },
  ].filter((d) => d.value > 0);

  // ── By city ───────────────────────────────────────────────────
  const byCity = new Map<string, { clients: number; orders: number; sale: number }>();
  for (const c of clients) {
    const confirmedOrders = c.orders.filter((o) => o.confirmed);
    const entry = byCity.get(c.city) ?? { clients: 0, orders: 0, sale: 0 };
    entry.clients += 1;
    entry.orders += confirmedOrders.length;
    entry.sale += confirmedOrders.reduce((s, o) => s + o.saleAmount, 0);
    byCity.set(c.city, entry);
  }
  const cityData: CityData[] = [...byCity.entries()]
    .map(([city, d]) => ({ city, ...d }))
    .sort((a, b) => b.sale - a.sale);

  // ── Top customers ─────────────────────────────────────────────
  const topClients = clients
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      orders: c.orders.filter((o) => o.confirmed).length,
      sale: c.orders.filter((o) => o.confirmed).reduce((s, o) => s + o.saleAmount, 0),
      received: c.orders
        .filter((o) => o.confirmed)
        .reduce((s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0), 0),
    }))
    .filter((c) => c.orders > 0)
    .sort((a, b) => b.sale - a.sale)
    .slice(0, 5);

  const hasSalesData = orders.length > 0;
  const hasLeadData = leads.length > 0;

  return (
    <AmountVisibilityProvider>
      <div className="space-y-8">
        {/* Access denied banner */}
        {error === "access" && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            You don't have permission to access that page.
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Overview of your business performance.</p>
          </div>
          <AmountToggleButton />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Customers" value={totalClients} />
          <StatCard label="Orders" value={totalOrders} />
          <StatCard label="Total Sale" value={<Amount value={fmt(totalSale)} />} />
          <StatCard label="Pending" value={<Amount value={fmt(pendingSale)} />} dark />
        </div>

        {/* Sales trend + Payment status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Monthly Sales — Last 7 Months</h2>
            {hasSalesData ? (
              <SalesBarChart data={monthlyStats} />
            ) : (
              <EmptyChart />
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Payment Status</h2>
            <p className="text-xs text-gray-400 mb-3">{totalOrders} confirmed orders</p>
            {hasSalesData ? (
              <PaymentStatusPie data={paymentStatusData} />
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* Revenue trend + Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Revenue Trend</h2>
            {hasSalesData ? (
              <RevenueTrendChart data={monthlyStats} />
            ) : (
              <EmptyChart />
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Lead Pipeline</h2>
            <p className="text-xs text-gray-400 mb-3">{leads.length} total leads</p>
            {hasLeadData ? (
              <LeadStatusPie data={leadStatusData} />
            ) : (
              <EmptyChart label="No leads yet" />
            )}
          </div>
        </div>

        {/* City performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Sales by City</h2>
            {cityData.length > 0 ? (
              <CityBarChart data={cityData} />
            ) : (
              <EmptyChart />
            )}
          </div>

          {/* Top customers */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Top Customers</h2>
            {topClients.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => {
                  const pct = totalSale > 0 ? (c.sale / totalSale) * 100 : 0;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <Link href={`/clients/${c.id}`} className="font-medium text-gray-800 hover:underline truncate max-w-[60%]">
                          {i + 1}. {c.name}
                        </Link>
                        <span className="text-xs text-gray-500 tabular-nums shrink-0 ml-2">
                          <Amount value={fmt(c.sale)} />
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-900 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* City table */}
        {cityData.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3 text-gray-700">Performance by City</h2>
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                    <th className="py-3 px-5">City</th>
                    <th className="py-3 px-5">Customers</th>
                    <th className="py-3 px-5">Orders</th>
                    <th className="py-3 px-5">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cityData.map(({ city, clients: cc, orders: co, sale }) => (
                    <tr key={city} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-5 font-medium">
                        <Link href={`/clients?city=${encodeURIComponent(city)}`} className="hover:underline">
                          {city}
                        </Link>
                      </td>
                      <td className="py-3 px-5 text-gray-600">{cc}</td>
                      <td className="py-3 px-5 text-gray-600">{co}</td>
                      <td className="py-3 px-5 font-medium tabular-nums">
                        <Amount value={fmt(sale)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AmountVisibilityProvider>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function StatCard({
  label,
  value,
  dark,
}: {
  label: string;
  value: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border shadow-sm ${
        dark ? "bg-black text-white border-black" : "bg-white text-black border-gray-200"
      }`}
    >
      <div className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</div>
      <div className="text-2xl font-semibold mt-2 tracking-tight">{value}</div>
    </div>
  );
}

function EmptyChart({ label = "No data yet" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-[180px]">
      <p className="text-sm text-gray-300">{label}</p>
    </div>
  );
}
