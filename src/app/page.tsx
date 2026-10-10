import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DateRangeFilter from "@/components/DateRangeFilter";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { parsePermissions, canView } from "@/lib/permissions";
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
  searchParams: Promise<{ error?: string; from?: string; to?: string }>;
}) {
  const { error, from, to } = await searchParams;

  const me = await getSessionUser();
  if (!me) redirect("/login");
  const dashboardAllowed = me.isAdmin || canView(parsePermissions(me.permissions), "dashboard", false);

  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;
  const dateFilter = fromDate || toDate
    ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
    : {};

  const [clients, leads, orders, retailCustomers, retailOrders, dueOrders] = await Promise.all([
    prisma.client.findMany({
      include: { orders: { include: { payments: true } } },
    }),
    prisma.lead.findMany({ select: { status: true } }),
    prisma.order.findMany({
      where: { confirmed: true, ...dateFilter },
      include: { payments: true },
      orderBy: { date: "asc" },
    }),
    prisma.retailCustomer.count(),
    prisma.retailOrder.aggregate({
      where: dateFilter,
      _sum: { totalAmount: true },
    }),
    // "Needs attention": confirmed orders still waiting on payment, oldest first.
    prisma.order.findMany({
      where: { confirmed: true, paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
      include: { payments: { select: { amount: true } }, client: { select: { id: true, name: true, city: true } } },
      orderBy: { date: "asc" },
      take: 8,
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
    { name: "Paid", value: statusCounts.PAID, color: "#12B76A" },
    { name: "Partial", value: statusCounts.PARTIAL, color: "#F79009" },
    { name: "Unpaid", value: statusCounts.UNPAID, color: "#F04438" },
  ].filter((d) => d.value > 0);

  // ── Lead status breakdown ──────────────────────────────────────
  const leadCounts = { NEW: 0, CONTACTED: 0, INTERESTED: 0, SAMPLE_SENT: 0 };
  for (const l of leads) {
    if (l.status === "NEW") leadCounts.NEW++;
    else if (l.status === "CONTACTED") leadCounts.CONTACTED++;
    else if (l.status === "INTERESTED") leadCounts.INTERESTED++;
    else if (l.status === "SAMPLE_SENT") leadCounts.SAMPLE_SENT++;
  }
  const leadStatusData: LeadStatusData[] = [
    { name: "Not Contacted", value: leadCounts.NEW, color: "#e5e7eb" },
    { name: "Contacted", value: leadCounts.CONTACTED, color: "#a1a1aa" },
    { name: "Deal in Process", value: leadCounts.INTERESTED, color: "#FDB022" },
    { name: "Sample Sent", value: leadCounts.SAMPLE_SENT, color: "#F15A24" },
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

  const retailSaleTotal = retailOrders._sum.totalAmount ?? 0;

  // KPI badges compare this month so far with the same days of last month,
  // so a half-finished month isn't measured against a full one.
  const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthSameDay = new Date(lastMonthStart.getTime() + (now.getTime() - monthStart.getTime()));
  const thisPeriod = orders.filter((o) => o.date >= monthStart);
  const lastPeriod = orders.filter((o) => o.date >= lastMonthStart && o.date <= lastMonthSameDay);
  const ordersThisMonth = thisPeriod.length;
  const saleChange = pctChange(thisPeriod.reduce((s, o) => s + o.saleAmount, 0), lastPeriod.reduce((s, o) => s + o.saleAmount, 0));
  const ordersChange = pctChange(thisPeriod.length, lastPeriod.length);
  const newClientsThisMonth = clients.filter((c) => c.createdAt >= monthStart).length;
  const balanceOrders = orders.filter((o) => o.paymentStatus !== "PAID").length;

  const hasSalesData = orders.length > 0;
  const hasLeadData = leads.length > 0;

  if (!dashboardAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
          <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 text-gray-400">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 7v4M10 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No dashboard access</p>
        <p className="text-xs text-gray-400">Your admin has not given you access to the dashboard.</p>
      </div>
    );
  }

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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {from || to
                ? `${from ?? "—"} to ${to ?? "—"}`
                : "Overview of your business performance."}
            </p>
          </div>
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            <form method="GET" className="w-full sm:w-auto flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1.5">
              <DateRangeFilter from={from} to={to} />
              <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                Apply
              </button>
              {(from || to) && (
                <Link href="/" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
              )}
            </form>
            <AmountToggleButton />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            tone="green"
            icon={<path d="M3 14l4.5-4.5 3 3L17 6M12 6h5v5" />}
            label="Wholesale Revenue"
            value={<Amount value={`Rs ${fmt(totalSale)}`} />}
            change={saleChange}
            sub={<>Retail: <Amount value={`Rs ${fmt(retailSaleTotal)}`} /></>}
          />
          <KpiCard
            tone="green"
            icon={<path d="M3 4h2l1.6 8.2a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L17.5 7H6M9 17h.01M15 17h.01" />}
            label="Confirmed Orders"
            value={totalOrders.toLocaleString()}
            change={ordersChange}
            sub={`${ordersThisMonth} this month`}
          />
          <KpiCard
            tone="orange"
            icon={<path d="M10 3l8 14H2L10 3zM10 8v4M10 14.5h.01" />}
            label="Balance Due"
            value={<Amount value={`Rs ${fmt(pendingSale)}`} />}
            badge={`${balanceOrders} orders`}
            sub={<>Received: <Amount value={`Rs ${fmt(totalReceived)}`} /></>}
          />
          <KpiCard
            tone="teal"
            icon={<path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1.5 17a5.5 5.5 0 0 1 11 0M13.5 3.5a3 3 0 0 1 0 5.5M18.5 17a5.5 5.5 0 0 0-3.5-5.1" />}
            label="B2B Customers"
            value={totalClients.toLocaleString()}
            badge={newClientsThisMonth > 0 ? `+${newClientsThisMonth} new` : undefined}
            sub={`${retailCustomers.toLocaleString()} retail customers`}
          />
        </div>

        {/* Sales trend + Payment status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Monthly Sales — Last 7 Months</h2>
            {hasSalesData ? (
              <SalesBarChart data={monthlyStats} />
            ) : (
              <EmptyChart />
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Payment Status</h2>
            <p className="text-xs text-gray-400 mb-3">{totalOrders} confirmed orders</p>
            {hasSalesData ? (
              <PaymentStatusPie data={paymentStatusData} />
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* Needs attention */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FFF1EA] text-[#F15A24] flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6.5v4M10 13.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </span>
              <h2 className="text-base font-semibold text-gray-900">Needs Attention</h2>
              <span className="text-xs font-medium text-[#D9480F] bg-[#FFF1EA] px-2 py-0.5 rounded-full">{dueOrders.length} items</span>
            </div>
            <Link href="/sales/invoices/advance" className="text-sm font-medium text-[#F15A24] hover:text-[#D9480F]">View All</Link>
          </div>
          {dueOrders.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-gray-400">All confirmed orders are fully paid.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-[#FAFBFC] border-y border-gray-100 text-gray-500 text-xs font-medium">
                    <th className="py-3 px-5">Invoice</th>
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-5 hidden sm:table-cell">City</th>
                    <th className="py-3 px-5 hidden md:table-cell">Date</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5 text-right">Balance</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dueOrders.map((o) => {
                    const paid = o.payments.reduce((s, p) => s + p.amount, 0);
                    const unpaid = o.paymentStatus === "UNPAID";
                    return (
                      <tr key={o.id} className={unpaid ? "bg-red-50/30" : ""}>
                        <td className="py-3 px-5 font-medium text-gray-900 whitespace-nowrap">INV-{String(o.id).padStart(4, "0")}</td>
                        <td className="py-3 px-5 text-gray-800">{o.client.name}</td>
                        <td className="py-3 px-5 text-gray-500 hidden sm:table-cell">{o.client.city}</td>
                        <td className="py-3 px-5 text-gray-500 hidden md:table-cell whitespace-nowrap">
                          {o.date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3 px-5 text-right tabular-nums text-gray-700"><Amount value={fmt(o.saleAmount)} /></td>
                        <td className={`py-3 px-5 text-right tabular-nums font-semibold ${unpaid ? "text-red-600" : "text-[#D9480F]"}`}>
                          <Amount value={fmt(Math.max(0, o.saleAmount - paid))} />
                        </td>
                        <td className="py-3 px-5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${unpaid ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                            {unpaid ? "Unpaid" : "Partial"}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <Link href={`/clients/${o.client.id}/orders/${o.id}`} className="inline-block bg-[#F15A24] hover:bg-[#D9480F] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenue trend + Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Trend</h2>
            {hasSalesData ? (
              <RevenueTrendChart data={monthlyStats} />
            ) : (
              <EmptyChart />
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Lead Pipeline</h2>
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
            <h2 className="text-base font-semibold text-gray-900 mb-4">Sales by City</h2>
            {cityData.length > 0 ? (
              <CityBarChart data={cityData} />
            ) : (
              <EmptyChart />
            )}
          </div>

          {/* Top customers */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Top Customers</h2>
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
                          className="h-full bg-[#F15A24] rounded-full"
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

const KPI_TONES = {
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-[#FFF1EA] text-[#F15A24]",
  teal: "bg-teal-50 text-teal-600",
} as const;

function KpiCard({
  icon,
  tone,
  label,
  value,
  change,
  badge,
  sub,
}: {
  icon: React.ReactNode;
  tone: keyof typeof KPI_TONES;
  label: string;
  value: React.ReactNode;
  change?: number | null;
  badge?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${KPI_TONES[tone]}`}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            {icon}
          </svg>
        </span>
        {change != null ? (
          <span className={`text-xs font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        ) : badge ? (
          <span className="text-xs font-semibold text-[#F15A24]">{badge}</span>
        ) : null}
      </div>
      <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-gray-900 mt-4 tabular-nums">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-2">{sub}</div>}
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
