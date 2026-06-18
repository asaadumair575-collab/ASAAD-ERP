import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const clients = await prisma.client.findMany({ include: { orders: true } });

  const totalClients = clients.length;
  const totalOrders = clients.reduce((sum, c) => sum + c.orders.length, 0);
  const allOrders = clients.flatMap((c) => c.orders);
  const paidOrders = allOrders.filter((o) => o.paymentStatus === "PAID");
  const totalSale = paidOrders.reduce((s, o) => s + o.saleAmount, 0);
  const pendingSale = allOrders
    .filter((o) => o.paymentStatus !== "PAID")
    .reduce((s, o) => s + o.saleAmount, 0);
  const totalPurchase = paidOrders.reduce((s, o) => s + o.purchaseAmount, 0);
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
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your customers and business performance.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Customers" value={totalClients} />
        <StatCard label="Orders" value={totalOrders} />
        <StatCard label="Total Sales (Paid)" value={fmt(totalSale)} />
        <StatCard label="Pending Payments" value={fmt(pendingSale)} />
        <StatCard label="Total Profit" value={fmt(totalProfit)} dark />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">By City</h2>
        {byCity.size === 0 ? (
          <div className="border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm">
              No customers yet.{" "}
              <Link href="/clients/new" className="text-black underline font-medium">
                Add your first customer
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="py-3 px-5 font-medium">City</th>
                  <th className="py-3 px-5 font-medium">Customers</th>
                  <th className="py-3 px-5 font-medium">Orders</th>
                  <th className="py-3 px-5 font-medium">Sales</th>
                  <th className="py-3 px-5 font-medium">Purchase Cost</th>
                  <th className="py-3 px-5 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...byCity.entries()]
                  .sort((a, b) => b[1].sale - a[1].sale)
                  .map(([city, d]) => (
                    <tr key={city} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-5 font-medium">
                        <Link
                          href={`/clients?city=${encodeURIComponent(city)}`}
                          className="hover:underline"
                        >
                          {city}
                        </Link>
                      </td>
                      <td className="py-3 px-5">{d.clients}</td>
                      <td className="py-3 px-5">{d.orders}</td>
                      <td className="py-3 px-5">{fmt(d.sale)}</td>
                      <td className="py-3 px-5">{fmt(d.purchase)}</td>
                      <td className="py-3 px-5 font-medium">
                        {fmt(d.sale - d.purchase)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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
  dark,
}: {
  label: string;
  value: string | number;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border ${
        dark
          ? "bg-black text-white border-black"
          : "bg-white text-black border-gray-200"
      }`}
    >
      <div className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </div>
      <div className="text-2xl font-semibold mt-2 tracking-tight">
        {value}
      </div>
    </div>
  );
}
