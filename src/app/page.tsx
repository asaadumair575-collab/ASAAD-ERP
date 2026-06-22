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
      <div className="space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Overview of your customers and business performance.
            </p>
          </div>
          <AmountToggleButton />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Customers" value={totalClients} />
          <StatCard label="Orders" value={totalOrders} />
          <StatCard label="Total Received" value={<Amount value={fmt(totalSale)} />} />
          <StatCard
            label="Pending Payments"
            value={<Amount value={fmt(pendingSale)} />}
            dark
          />
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
            <div className="border border-gray-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                    <th className="py-3 px-5 font-medium">City</th>
                    <th className="py-3 px-5 font-medium">Customers</th>
                    <th className="py-3 px-5 font-medium">Orders</th>
                    <th className="py-3 px-5 font-medium">Sales</th>
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
                        <td className="py-3 px-5">
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
