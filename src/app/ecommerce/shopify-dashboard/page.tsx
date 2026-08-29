import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DateNav from "./DateNav";

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN ?? "";
const API = `https://${DOMAIN}/admin/api/2024-07`;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function pct(a: number, b: number) {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

function pctNum(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

type ShopifyOrder = {
  id: number;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancel_reason: string | null;
  shipping_address?: { city?: string };
  billing_address?: { city?: string };
  created_at: string;
};

async function fetchOrders(from: string, to: string): Promise<{ orders: ShopifyOrder[]; error?: string }> {
  if (!DOMAIN || !TOKEN) return { orders: [], error: "config" };

  const minDate = new Date(`${from}T00:00:00+05:00`).toISOString();
  const maxDate = new Date(`${to}T23:59:59+05:00`).toISOString();

  const all: ShopifyOrder[] = [];
  let url: string | null =
    `${API}/orders.json?status=any&created_at_min=${encodeURIComponent(minDate)}&created_at_max=${encodeURIComponent(maxDate)}&limit=250&fields=id,total_price,financial_status,fulfillment_status,cancel_reason,shipping_address,billing_address,created_at`;

  while (url) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": TOKEN },
        cache: "no-store",
      });
    } catch {
      return { orders: all, error: "network" };
    }
    if (!res.ok) return { orders: all, error: `${res.status}` };
    const data: { orders?: ShopifyOrder[] } = await res.json();
    all.push(...(data.orders ?? []));

    const link: string = res.headers.get("link") ?? "";
    const next: string | null = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  return { orders: all };
}

export default async function ShopifyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { from: fromParam, to: toParam } = await searchParams;

  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const from = fromParam ?? todayPK;
  const to = toParam ?? todayPK;

  const { orders, error } = await fetchOrders(from, to);

  // --- Metrics ---
  const total = orders.length;
  const revenue = orders.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0);
  const avgOrder = total ? revenue / total : 0;

  const paid = orders.filter((o) => o.financial_status === "paid").length;
  const unpaid = orders.filter((o) => o.financial_status === "pending").length;
  const cancelled = orders.filter((o) => !!o.cancel_reason).length;
  const fulfilled = orders.filter((o) => o.fulfillment_status === "fulfilled").length;
  const unfulfilled = orders.filter((o) => !o.fulfillment_status && !o.cancel_reason).length;
  const conversionRate = pctNum(paid, total);

  // --- City breakdown ---
  const cityMap: Record<string, { orders: number; revenue: number }> = {};
  for (const o of orders) {
    const city = (o.shipping_address?.city ?? o.billing_address?.city ?? "Unknown").trim();
    if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0 };
    cityMap[city].orders += 1;
    cityMap[city].revenue += parseFloat(o.total_price || "0");
  }
  const cities = Object.entries(cityMap)
    .sort((a, b) => b[1].orders - a[1].orders)
    .slice(0, 10);

  const topCityOrders = cities[0]?.[1].orders ?? 0;

  // --- Date label ---
  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })} — ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Shopify Store</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        {total > 0 && (
          <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold tabular-nums">Rs {fmt(revenue)}</p>
            </div>
          </div>
        )}
      </div>

      {error === "config" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <strong>Config missing:</strong> SHOPIFY_ADMIN_TOKEN ya SHOPIFY_STORE_DOMAIN Vercel mein set nahi.
        </div>
      )}
      {error && error !== "config" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <strong>API Error {error}:</strong> Shopify se data nahi aya. Token ya domain check karo.
        </div>
      )}

      {/* Date picker */}
      <DateNav from={from} to={to} />

      {total > 0 ? (
        <>
          {/* Row 1 — key numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BigStat label="Total Orders" value={String(total)} accent="slate" />
            <BigStat label="Paid Orders" value={String(paid)} sub={pct(paid, total)} accent="green" />
            <BigStat label="Avg Order Value" value={`Rs ${fmt(avgOrder)}`} accent="blue" />
            <BigStat label="Conversion" value={`${conversionRate}%`} sub="paid / total" accent="violet" />
          </div>

          {/* Row 2 — order status breakdown */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Order Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatusTile label="Fulfilled" count={fulfilled} total={total} color="bg-emerald-500" />
              <StatusTile label="Unfulfilled" count={unfulfilled} total={total} color="bg-amber-400" />
              <StatusTile label="Unpaid" count={unpaid} total={total} color="bg-blue-400" />
              <StatusTile label="Cancelled" count={cancelled} total={total} color="bg-red-400" />
            </div>
          </div>

          {/* Revenue strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RevenueCard label="Gross Revenue" value={`Rs ${fmt(revenue)}`} />
            <RevenueCard label="Paid Revenue" value={`Rs ${fmt(orders.filter(o => o.financial_status === "paid").reduce((s, o) => s + parseFloat(o.total_price || "0"), 0))}`} sub="from paid orders" />
            <RevenueCard label="Orders per day" value={from === to ? String(total) : String(Math.round(total / (Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1))))} sub={from === to ? "today" : "avg daily"} />
          </div>

          {/* City breakdown */}
          {cities.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">City-wise Breakdown</p>
                <span className="text-xs text-gray-400">{cities.length} cities</span>
              </div>
              <div className="divide-y divide-gray-50">
                {cities.map(([city, stats], i) => (
                  <div key={city} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-xs font-bold text-gray-300 w-5 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-800 truncate">{city}</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums ml-3">Rs {fmt(stats.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 rounded-full transition-all"
                            style={{ width: `${Math.round((stats.orders / topCityOrders) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                          {stats.orders} orders · {pct(stats.orders, total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
                <span className="text-xs font-semibold text-gray-500">Total</span>
                <span className="text-xs font-bold text-gray-900 tabular-nums">{total} orders · Rs {fmt(revenue)}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        !error && (
          <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
            <p className="text-3xl mb-3">📦</p>
            <p className="text-sm font-medium text-gray-500">Is date range mein koi orders nahi</p>
            <p className="text-xs text-gray-400 mt-1">Date change kar ke dobara try karo</p>
          </div>
        )
      )}
    </div>
  );
}

function BigStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  const bg: Record<string, string> = {
    slate: "bg-gray-900 text-white",
    green: "bg-green-50 border border-green-200 text-green-900",
    blue: "bg-blue-50 border border-blue-200 text-blue-900",
    violet: "bg-violet-50 border border-violet-200 text-violet-900",
  };
  const subColor: Record<string, string> = {
    slate: "text-gray-400",
    green: "text-green-500",
    blue: "text-blue-500",
    violet: "text-violet-500",
  };
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${bg[accent]}`}>
      <p className="text-xs font-medium opacity-60 mb-2">{label}</p>
      <p className="text-3xl font-bold tabular-nums leading-none">{value}</p>
      {sub && <p className={`text-xs mt-1.5 font-semibold ${subColor[accent]}`}>{sub}</p>}
    </div>
  );
}

function StatusTile({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{count}</p>
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: pct(count, total) }} />
      </div>
      <p className="text-xs text-gray-400 mt-1 tabular-nums">{pct(count, total)}</p>
    </div>
  );
}

function RevenueCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
