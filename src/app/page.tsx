import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const clients = await prisma.client.findMany({ include: { orders: true } });

  const totalClients = clients.length;
  const totalOrders = clients.reduce((sum, c) => sum + c.orders.length, 0);
  const totalSale = clients.reduce(
    (sum, c) => sum + c.orders.reduce((s, o) => s + o.saleAmount, 0),
    0
  );
  const totalPurchase = clients.reduce(
    (sum, c) => sum + c.orders.reduce((s, o) => s + o.purchaseAmount, 0),
    0
  );
  const totalProfit = totalSale - totalPurchase;

  const byCity = new Map<
    string,
    { clients: number; orders: number; sale: number; purchase: number }
  >();
  for (const c of clients) {
    const entry = byCity.get(c.city) ?? {
      clients: 0,
      orders: 0,
      sale: 0,
      purchase: 0,
    };
    entry.clients += 1;
    entry.orders += c.orders.length;
    entry.sale += c.orders.reduce((s, o) => s + o.saleAmount, 0);
    entry.purchase += c.orders.reduce((s, o) => s + o.purchaseAmount, 0);
    byCity.set(c.city, entry);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Clients" value={totalClients} />
        <StatCard label="Orders" value={totalOrders} />
        <StatCard label="Total Sales" value={fmt(totalSale)} />
        <StatCard
          label="Total Profit"
          value={fmt(totalProfit)}
          highlight={totalProfit >= 0 ? "green" : "red"}
        />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">By City</h2>
        {byCity.size === 0 ? (
          <p className="text-gray-500 text-sm">
            No clients yet.{" "}
            <Link href="/clients/new" className="text-blue-600 underline">
              Add your first client
            </Link>
            .
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-4">City</th>
                <th className="py-2 pr-4">Clients</th>
                <th className="py-2 pr-4">Orders</th>
                <th className="py-2 pr-4">Sales</th>
                <th className="py-2 pr-4">Purchase Cost</th>
                <th className="py-2 pr-4">Profit</th>
              </tr>
            </thead>
            <tbody>
              {[...byCity.entries()]
                .sort((a, b) => b[1].sale - a[1].sale)
                .map(([city, d]) => (
                  <tr key={city} className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/clients?city=${encodeURIComponent(city)}`}
                        className="text-blue-600 hover:underline"
                      >
                        {city}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{d.clients}</td>
                    <td className="py-2 pr-4">{d.orders}</td>
                    <td className="py-2 pr-4">{fmt(d.sale)}</td>
                    <td className="py-2 pr-4">{fmt(d.purchase)}</td>
                    <td className="py-2 pr-4">{fmt(d.sale - d.purchase)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "green" | "red";
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-xl font-semibold mt-1 ${
          highlight === "green"
            ? "text-green-600"
            : highlight === "red"
              ? "text-red-600"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
