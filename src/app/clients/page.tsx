import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { averageMonthlyDzn, gradeForMonthlyDzn } from "@/lib/grade";
import { deleteClient } from "@/lib/actions";
import WhatsAppButton from "@/components/WhatsAppButton";

const PAGE_SIZE = 30;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string; grade?: string; page?: string }>;
}) {
  const { city, q, grade: gradeFilter, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const clients = await prisma.client.findMany({
    where: {
      ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { businessName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    include: { orders: { include: { items: true, payments: true } } },
    orderBy: { name: "asc" },
  });

  const rawClientCities = await prisma.client.findMany({
    select: { city: true },
  });
  const clientCityMap = new Map<string, string>();
  const clientCityCounts = new Map<string, number>();
  for (const { city: rawCity } of rawClientCities) {
    const trimmed = rawCity?.trim();
    if (!trimmed || trimmed === "-" || !/[a-zA-Z]/.test(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (!clientCityMap.has(key)) clientCityMap.set(key, trimmed);
    clientCityCounts.set(key, (clientCityCounts.get(key) ?? 0) + 1);
  }
  const allCities = Array.from(clientCityMap.entries())
    .map(([key, city]) => ({ city, count: clientCityCounts.get(key) ?? 0 }))
    .sort((a, b) => a.city.localeCompare(b.city));

  const clientsWithGrade = clients.map((c) => {
    const ledgerOrders = c.orders.filter((o) => o.confirmed);
    const paidOrders = ledgerOrders.filter((o) => o.paymentStatus === "PAID");
    const grade = gradeForMonthlyDzn(
      averageMonthlyDzn(paidOrders),
      paidOrders.length > 0
    );
    return { client: c, ledgerOrders, grade };
  });

  const filteredClients = gradeFilter
    ? clientsWithGrade.filter((c) => c.grade.label === gradeFilter)
    : clientsWithGrade;

  const activeCount = filteredClients.filter((c) => c.ledgerOrders.length > 0).length;
  const inactiveCount = filteredClients.length - activeCount;

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const pagedClients = filteredClients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">
          {filteredClients.length} customer
          {filteredClients.length === 1 ? "" : "s"} &middot; {activeCount} active
          (have orders) &middot; {inactiveCount} nil
        </p>
      </div>

      <form
        className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 rounded-2xl shadow-sm p-3"
        method="get"
      >
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
            />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, business or phone..."
            className="w-full bg-gray-50 border border-transparent rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
          />
        </div>
        <select
          name="city"
          defaultValue={city ?? ""}
          className="bg-gray-50 border border-transparent rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
        >
          <option value="">All cities</option>
          {allCities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.city} ({c.count})
            </option>
          ))}
        </select>
        <select
          name="grade"
          defaultValue={gradeFilter ?? ""}
          className="bg-gray-50 border border-transparent rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
        >
          <option value="">All grades</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="Nil">Nil</option>
        </select>
        <button
          type="submit"
          className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Filter
        </button>
        {(city || q || gradeFilter) && (
          <Link
            href="/clients"
            className="text-sm text-gray-400 hover:text-black px-2 py-2.5 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {filteredClients.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Name</th>
                <th className="py-3 px-5 font-medium">Business</th>
                <th className="py-3 px-5 font-medium">City</th>
                <th className="py-3 px-5 font-medium">Phone</th>
                <th className="py-3 px-5 font-medium">Orders</th>
                <th className="py-3 px-5 font-medium">Total Received</th>
                <th className="py-3 px-5 font-medium">Grade</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedClients.map(({ client: c, ledgerOrders, grade }) => {
                const totalReceived = ledgerOrders.reduce(
                  (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
                  0
                );
                const deleteClientBound = deleteClient.bind(null, c.id);
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
                      {ledgerOrders.length}
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {totalReceived.toLocaleString()}
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${grade.badgeClass}`}
                      >
                        {grade.label}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <WhatsAppButton phone={c.phone} />
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Link
                        href={`/clients/${c.id}/edit`}
                        className="text-xs text-gray-400 hover:text-black transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <form action={deleteClientBound}>
                        <button
                          type="submit"
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={{
                  pathname: "/clients",
                  query: { q, city, grade: gradeFilter, page: currentPage - 1 },
                }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={{
                  pathname: "/clients",
                  query: { q, city, grade: gradeFilter, page: currentPage + 1 },
                }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next 30
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
