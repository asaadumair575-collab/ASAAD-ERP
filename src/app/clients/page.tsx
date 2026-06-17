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
        ? { name: { contains: q } }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link
          href="/clients/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md"
        >
          + Add Client
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 items-end" method="get">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search name</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search..."
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">City</label>
          <select
            name="city"
            defaultValue={city ?? ""}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
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
          className="bg-gray-200 text-sm px-4 py-1.5 rounded-md"
        >
          Filter
        </button>
        {(city || q) && (
          <Link href="/clients" className="text-sm text-blue-600">
            Clear
          </Link>
        )}
      </form>

      {clients.length === 0 ? (
        <p className="text-gray-500 text-sm">No clients found.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200 text-gray-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">City</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Total Spent</th>
              <th className="py-2 pr-4">Profit</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const sale = c.orders.reduce((s, o) => s + o.saleAmount, 0);
              const purchase = c.orders.reduce(
                (s, o) => s + o.purchaseAmount,
                0
              );
              return (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/clients/${c.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{c.city}</td>
                  <td className="py-2 pr-4">{c.phone ?? "-"}</td>
                  <td className="py-2 pr-4">{c.orders.length}</td>
                  <td className="py-2 pr-4">{sale.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    {(sale - purchase).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
