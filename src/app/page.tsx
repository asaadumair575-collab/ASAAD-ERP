import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  AmountVisibilityProvider,
  AmountToggleButton,
  Amount,
} from "@/components/AmountVisibility";

export default async function DashboardPage() {
  const clients = await prisma.client.findMany({
    include: { orders: { include: { payments: true } } },
  });

  const totalClients = clients.length;
  const allOrders = clients.flatMap((c) => c.orders).filter((o) => o.confirmed);
  const totalOrders = allOrders.length;
  const totalSale = allOrders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const pendingSale = allOrders.reduce((s, o) => {
    const paid = o.payments.reduce((ps, p) => ps + p.amount, 0);
    return s + Math.max(0, o.saleAmount - paid);
  }, 0);
  const byCity = new Map<string, { clients: number; orders: number; sale: number }>();
  for (const c of clients) {
    const confirmedOrders = c.orders.filter((o) => o.confirmed);
    const entry = byCity.get(c.city) ?? { clients: 0, orders: 0, sale: 0 };
    entry.clients += 1;
    entry.orders += confirmedOrders.length;
    entry.sale += confirmedOrders.reduce((s, o) => s + o.saleAmount, 0);
    byCity.set(c.city, entry);
  }

  return (
    <AmountVisibilityProvider>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Overview of your business performance.</p>
          </div>
          <AmountToggleButton />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Customers" value={totalClients} />
          <StatCard label="Orders" value={totalOrders} />
          <StatCard label="Total Received" value={<Amount value={fmt(totalSale)} />} />
          <StatCard label="Pending" value={<Amount value={fmt(pendingSale)} />} dark />
        </div>

        <div>
          <h2 className="text-base font-semibold mb-3 text-gray-700">Performance by City</h2>
          {byCity.size === 0 ? (
            <div className="border border-gray-200 rounded-2xl p-12 text-center space-y-2">
              <p className="text-gray-400 text-sm">No customers yet.</p>
              <Link href="/clients/new" className="text-sm font-medium text-black hover:underline">
                Add your first customer →
              </Link>
            </div>
          ) : (
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
                  {[...byCity.entries()]
                    .sort((a, b) => b[1].sale - a[1].sale)
                    .map(([city, d]) => (
                      <tr key={city} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-5 font-medium">
                          <Link href={`/clients?city=${encodeURIComponent(city)}`} className="hover:underline">
                            {city}
                          </Link>
                        </td>
                        <td className="py-3 px-5 text-gray-600">{d.clients}</td>
                        <td className="py-3 px-5 text-gray-600">{d.orders}</td>
                        <td className="py-3 px-5 font-medium tabular-nums">
                          <Amount value={fmt(d.sale)} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AmountVisibilityProvider>
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
  value: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border shadow-sm ${
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
