import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { averageMonthlyDzn, gradeForMonthlyDzn } from "@/lib/grade";
import { deleteClient } from "@/lib/actions";
import WhatsAppButton from "@/components/WhatsAppButton";
import DeleteButton from "@/components/DeleteButton";

const PAGE_SIZE = 30;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string; grade?: string; page?: string; type?: string }>;
}) {
  const { city, q, grade: gradeFilter, page, type: typeFilter } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const clients = await prisma.client.findMany({
    where: {
      ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
      ...(typeFilter ? { customerType: typeFilter } : {}),
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

  const rawClientCities = await prisma.client.findMany({ select: { city: true } });
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
    const grade = gradeForMonthlyDzn(averageMonthlyDzn(paidOrders), paidOrders.length > 0);
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

  const hasFilters = !!(city || q || gradeFilter || typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredClients.length} customer{filteredClients.length === 1 ? "" : "s"}
            {" · "}
            <span className="text-green-700 font-medium">{activeCount} active</span>
            {" · "}
            <span className="text-gray-400">{inactiveCount} nil</span>
          </p>
        </div>
        <Link
          href="/clients/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add Customer
        </Link>
      </div>

      {/* Filter bar */}
      <form
        className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5"
        method="get"
      >
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, business or phone..."
            className="w-full bg-gray-50 border border-transparent rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
          />
        </div>
        <select
          name="city"
          defaultValue={city ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
        >
          <option value="">All cities</option>
          {allCities.map((c) => (
            <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={typeFilter ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
        >
          <option value="">All types</option>
          <option value="WHOLESALER">Wholesaler</option>
          <option value="SHOPKEEPER">Shop Keeper</option>
          <option value="RETAIL">Retail / COD</option>
        </select>
        <select
          name="grade"
          defaultValue={gradeFilter ?? ""}
          className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
        >
          <option value="">All grades</option>
          <option value="A">Grade A</option>
          <option value="B">Grade B</option>
          <option value="C">Grade C</option>
          <option value="Nil">Nil</option>
        </select>
        <button
          type="submit"
          className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active:</span>
          {q && (
            <Link href={{ pathname: "/clients", query: { city, grade: gradeFilter, type: typeFilter } }} className="filter-chip">
              Search: {q}<span className="filter-chip-x">×</span>
            </Link>
          )}
          {city && (
            <Link href={{ pathname: "/clients", query: { q, grade: gradeFilter, type: typeFilter } }} className="filter-chip">
              {city}<span className="filter-chip-x">×</span>
            </Link>
          )}
          {typeFilter && (
            <Link href={{ pathname: "/clients", query: { q, city, grade: gradeFilter } }} className="filter-chip">
              {typeFilter === "WHOLESALER" ? "Wholesaler" : typeFilter === "SHOPKEEPER" ? "Shop Keeper" : "Retail/COD"}
              <span className="filter-chip-x">×</span>
            </Link>
          )}
          {gradeFilter && (
            <Link href={{ pathname: "/clients", query: { q, city, type: typeFilter } }} className="filter-chip">
              Grade {gradeFilter}<span className="filter-chip-x">×</span>
            </Link>
          )}
          <Link
            href="/clients"
            className="text-xs text-gray-400 hover:text-black transition-colors ml-1"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* Table */}
      {filteredClients.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center space-y-2">
          <p className="text-gray-400 text-sm">No customers match your filters.</p>
          {hasFilters && (
            <Link href="/clients" className="text-sm font-medium text-black hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Business</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5">Phone</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Orders</th>
                <th className="py-3 px-5">Received</th>
                <th className="py-3 px-5">Grade</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagedClients.map(({ client: c, ledgerOrders, grade }) => {
                const totalReceived = ledgerOrders.reduce(
                  (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
                  0
                );
                const deleteClientBound = deleteClient.bind(null, c.id);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="py-3 px-5">
                      <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{c.businessName ?? "-"}</td>
                    <td className="py-3 px-5 text-gray-500">{c.city}</td>
                    <td className="py-3 px-5 text-gray-500">{c.phone ?? "-"}</td>
                    <td className="py-3 px-5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.customerType === "WHOLESALER" ? "bg-blue-50 text-blue-700" :
                        c.customerType === "SHOPKEEPER" ? "bg-purple-50 text-purple-700" :
                        "bg-orange-50 text-orange-700"
                      }`}>
                        {c.customerType === "WHOLESALER" ? "Wholesale" : c.customerType === "SHOPKEEPER" ? "Shop" : "COD"}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{ledgerOrders.length}</td>
                    <td className="py-3 px-5 text-gray-700 font-medium tabular-nums">
                      {totalReceived.toLocaleString()}
                    </td>
                    <td className="py-3 px-5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${grade.badgeClass}`}>
                        {grade.label}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <WhatsAppButton phone={c.phone} />
                    </td>
                    <td className="py-3 px-5">
                      <Link href={`/clients/${c.id}/edit`} className="text-xs text-gray-400 hover:text-black transition-colors">
                        Edit
                      </Link>
                    </td>
                    <td className="py-3 px-5">
                      <DeleteButton action={deleteClientBound} message="This customer and all their data will be permanently removed." />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={{ pathname: "/clients", query: { q, city, grade: gradeFilter, page: currentPage - 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
              >
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={{ pathname: "/clients", query: { q, city, grade: gradeFilter, page: currentPage + 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
              >
                Next 30 →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
