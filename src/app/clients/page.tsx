import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const { city, q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: {
      ...(city ? { city } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { businessName: { contains: q } },
            ],
          }
        : {}),
    },
    include: { orders: true },
    orderBy: { name: "asc" },
  });

  const allCities = await prisma.client.findMany({
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">
          {clients.length} client{clients.length === 1 ? "" : "s"}
        </p>
      </div>

      <form className="flex flex-wrap gap-3 items-end" method="get">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Search name or business
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">City</label>
          <select
            name="city"
            defaultValue={city ?? ""}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All cities</option>
            {allCities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Filter
        </button>
        {(city || q) && (
          <Link
            href="/clients"
            className="text-sm text-gray-500 hover:text-black px-2 py-2"
          >
            Clear
          </Link>
        )}
      </form>

      {clients.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No clients found.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Name</th>
                <th className="py-3 px-5 font-medium">Business</th>
                <th className="py-3 px-5 font-medium">City</th>
                <th className="py-3 px-5 font-medium">Phone</th>
                <th className="py-3 px-5 font-medium">Orders</th>
                <th className="py-3 px-5 font-medium">Total Spent</th>
                <th className="py-3 px-5 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => {
                const sale = c.orders.reduce((s, o) => s + o.saleAmount, 0);
                const purchase = c.orders.reduce(
                  (s, o) => s + o.purchaseAmount,
                  0
                );
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5">
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {c.businessName ?? "-"}
                    </td>
                    <td className="py-3 px-5 text-gray-600">{c.city}</td>
                    <td className="py-3 px-5 text-gray-600">
                      {c.phone ?? "-"}
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {c.orders.length}
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {sale.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 font-medium">
                      {(sale - purchase).toLocaleString()}
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
