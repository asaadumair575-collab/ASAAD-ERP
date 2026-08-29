import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DateNav from "./DateNav";

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN ?? "";
const API = `https://${DOMAIN}/admin/api/2024-01`;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function pct(a: number, b: number) {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
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

async function fetchOrders(from: string, to: string): Promise<ShopifyOrder[]> {
  const minDate = new Date(`${from}T00:00:00+05:00`).toISOString();
  const maxDate = new Date(`${to}T23:59:59+05:00`).toISOString();

  const all: ShopifyOrder[] = [];
  let url: string | null =
    `${API}/orders.json?status=any&created_at_min=${encodeURIComponent(minDate)}&created_at_max=${encodeURIComponent(maxDate)}&limit=250&fields=id,total_price,financial_status,fulfillment_status,cancel_reason,shipping_address,billing_address,created_at`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": TOKEN },
      next: { revalidate: 60 },
    });
    if (!res.ok) break;
    const data: { orders?: ShopifyOrder[] } = await res.json();
    all.push(...(data.orders ?? []));

    const link: string = res.headers.get("link") ?? "";
    const next: string | null = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  return all;
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

  const orders = await fetchOrders(from, to);

  // --- Metrics ---
  const total = orders.length;
  const revenue = orders.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0);
  const avgOrder = total ? revenue / total : 0;

  const paid = orders.filter((o) => o.financial_status === "paid").length;
  const cancelled = orders.filter((o) => o.cancel_reason).length;
  const fulfilled = orders.filter((o) => o.fulfillment_status === "fulfilled").length;
  const pending = orders.filter((o) => !o.cancel_reason && o.financial_status !== "paid").length;

  // --- City breakdown ---
  const cityMap: Record<string, { orders: number; revenue: number }> = {};
  for (const o of orders) {
    const city = (o.shipping_address?.city ?? o.billing_address?.city ?? "Unknown").trim();
    if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0 };
    cityMap[city].orders += 1;
    cityMap[city].revenue += parseFloat(o.total_price || "0");
  }
  const cities = Object.entries(cityMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8);

  // --- Date label ---
  const dateLabel =
    from === to
      ? new Date(`${from}T12:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${from} — ${to}`;

  const noConfig = !DOMAIN || !TOKEN;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shopify Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {noConfig && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          ⚠️ <strong>SHOPIFY_ADMIN_TOKEN</strong> ya <strong>SHOPIFY_STORE_DOMAIN</strong> Vercel mein set nahi — pehle woh karo.
        </div>
      )}

      {/* Date picker */}
      <DateNav from={from} to={to} />

      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Orders" value={total} sub={`Rs ${fmt(revenue)} revenue`} color="black" />
        <StatCard label="Avg Order Value" value={`Rs ${fmt(avgOrder)}`} color="blue" />
        <StatCard label="Paid" value={paid} sub={pct(paid, total)} color="green" />
        <StatCard label="Pending" value={pending} sub={pct(pending, total)} color="amber" />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Fulfilled" value={fulfilled} sub={pct(fulfilled, total)} color="emerald" />
        <StatCard label="Cancelled" value={cancelled} sub={pct(cancelled, total)} color="red" />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-xs text-gray-400 font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 tabular-nums mt-2">Rs {fmt(revenue)}</p>
        </div>
      </div>

      {/* City breakdown */}
      {cities.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">City-wise Breakdown</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="py-2.5 px-5">City</th>
                <th className="py-2.5 px-5 text-right">Orders</th>
                <th className="py-2.5 px-5 text-right">Share</th>
                <th className="py-2.5 px-5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cities.map(([city, stats]) => (
                <tr key={city}>
                  <td className="py-3 px-5 font-medium text-gray-800">{city}</td>
                  <td className="py-3 px-5 text-right tabular-nums text-gray-600">{stats.orders}</td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full" style={{ width: pct(stats.orders, total) }} />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{pct(stats.orders, total)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right tabular-nums font-semibold">Rs {fmt(stats.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="py-3 px-5">Total</td>
                <td className="py-3 px-5 text-right tabular-nums">{total}</td>
                <td className="py-3 px-5" />
                <td className="py-3 px-5 text-right tabular-nums">Rs {fmt(revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {total === 0 && !noConfig && (
        <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-sm text-gray-400">Is date range mein koi orders nahi aaye</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    black: "bg-gray-900 text-white border-gray-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };
  const subColors: Record<string, string> = {
    black: "text-gray-400",
    blue: "text-blue-500",
    green: "text-green-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    red: "text-red-400",
  };
  return (
    <div className={`border rounded-2xl p-5 shadow-sm ${colors[color]}`}>
      <p className="text-xs font-medium opacity-60 mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums leading-none">{value}</p>
      {sub && <p className={`text-xs mt-1.5 font-medium ${subColors[color]}`}>{sub}</p>}
    </div>
  );
}
