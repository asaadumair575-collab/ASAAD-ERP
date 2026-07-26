import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const { q, city } = await searchParams;

  // Fetch all orders, group by phone (fallback: name)
  const orders = await prisma.ecomOrder.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      customerName: true,
      phone: true,
      city: true,
      totalAmount: true,
      date: true,
      returned: true,
      status: true,
    },
    orderBy: { date: "desc" },
  });

  // Group by phone (or name if no phone)
  const customerMap = new Map<
    string,
    {
      key: string;
      customerName: string;
      phone: string | null;
      city: string | null;
      orderCount: number;
      deliveredCount: number;
      returnedCount: number;
      totalSpent: number;
      lastOrderDate: Date;
    }
  >();

  for (const o of orders) {
    const key = o.phone?.replace(/\s+/g, "") || o.customerName.toLowerCase().trim();
    const existing = customerMap.get(key);
    if (existing) {
      existing.orderCount++;
      if (o.returned) existing.returnedCount++;
      else if (o.status === "PAID") existing.deliveredCount++;
      existing.totalSpent += o.returned ? 0 : o.totalAmount;
      if (o.date > existing.lastOrderDate) {
        existing.lastOrderDate = o.date;
        existing.city = o.city ?? existing.city;
        existing.customerName = o.customerName;
      }
    } else {
      customerMap.set(key, {
        key,
        customerName: o.customerName,
        phone: o.phone,
        city: o.city,
        orderCount: 1,
        deliveredCount: o.returned ? 0 : o.status === "PAID" ? 1 : 0,
        returnedCount: o.returned ? 1 : 0,
        totalSpent: o.returned ? 0 : o.totalAmount,
        lastOrderDate: o.date,
      });
    }
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime()
  );

  // Get distinct cities for filter
  const cities = await prisma.ecomOrder.findMany({
    where: { city: { not: null } },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ecommerce Customers</h1>
        <p className="text-sm text-gray-500 mt-0.5">{customers.length} unique customers from all orders</p>
      </div>

      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, phone, city..."
          className="flex-1 min-w-[180px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <select
          name="city"
          defaultValue={city ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city!}>{c.city}</option>
          ))}
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
        {(q || city) && (
          <Link href="/ecommerce/customers" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
        )}
      </form>

      {customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5 text-center">Orders</th>
                <th className="py-3 px-5 text-center">Delivered</th>
                <th className="py-3 px-5 text-center">Returned</th>
                <th className="py-3 px-5 text-right">Total Spent</th>
                <th className="py-3 px-5">Last Order</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => {
                const href = `/ecommerce/customers/${encodeURIComponent(c.phone ?? `name:${c.customerName}`)}`;
                return (
                <tr key={c.key} className="hover:bg-gray-50/70 transition-colors cursor-pointer">
                  <td className="py-3 px-5">
                    <Link href={href} className="hover:underline">
                      <p className="font-medium">{c.customerName}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </Link>
                  </td>
                  <td className="py-3 px-5 text-gray-500">{c.city ?? "—"}</td>
                  <td className="py-3 px-5 text-center tabular-nums font-medium">{c.orderCount}</td>
                  <td className="py-3 px-5 text-center">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{c.deliveredCount}</span>
                  </td>
                  <td className="py-3 px-5 text-center">
                    {c.returnedCount > 0 ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">{c.returnedCount}</span>
                    ) : (
                      <span className="text-xs text-gray-300">0</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(c.totalSpent)}</td>
                  <td className="py-3 px-5 text-gray-400 text-xs">{c.lastOrderDate.toISOString().slice(0, 10)}</td>
                  <td className="py-3 px-5 text-right">
                    <Link href={href} className="text-xs text-gray-400 hover:text-black hover:underline">View →</Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
