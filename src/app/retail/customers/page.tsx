import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteRetailCustomer } from "@/lib/actions";
import DeleteButton from "@/components/DeleteButton";

function daysAgo(date: Date): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function RetailCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const { city, q } = await searchParams;

  const allCustomers = await prisma.retailCustomer.findMany({
    include: {
      _count: { select: { orders: true } },
      orders: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  const cities = [...new Set(allCustomers.map((c) => c.city).filter(Boolean) as string[])].sort();
  const customers = allCustomers.filter((c) => {
    const matchCity = !city || c.city === city;
    const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone ?? "").includes(q);
    return matchCity && matchQ;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retail Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} retail customer{customers.length !== 1 ? "s" : ""}
            {city ? ` in ${city}` : ""}
          </p>
        </div>
        <Link
          href="/retail/customers/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add Customer
        </Link>
      </div>

      {/* Search + City filter */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or phone…"
          className="flex-1 min-w-[160px] bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <select
          name="city"
          defaultValue={city ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {(city || q) && (
          <Link href="/retail/customers" className="text-sm text-gray-400 hover:text-black px-2">Clear</Link>
        )}
      </form>

      {customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No retail customers yet.</p>
          <Link href="/retail/customers/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">
            + Add your first customer
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Phone</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5 text-right">Orders</th>
                <th className="py-3 px-5 text-right">Last Order</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => {
                const deleteBound = deleteRetailCustomer.bind(null, c.id);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/retail/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.code && (
                        <span className="ml-2 text-[10px] font-mono font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          {c.code}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-gray-500">{c.phone ?? "—"}</td>
                    <td className="py-3 px-5 text-gray-500">{c.city ?? "—"}</td>
                    <td className="py-3 px-5 text-right text-gray-600">{c._count.orders}</td>
                    <td className="py-3 px-5 text-right text-gray-500 whitespace-nowrap">
                      {c.orders[0] ? daysAgo(c.orders[0].createdAt) : "—"}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <DeleteButton action={deleteBound} message="This customer will be unlinked from their orders and removed." />
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
