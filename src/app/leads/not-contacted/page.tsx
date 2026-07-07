import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { markLeadContacted, deleteLead } from "@/lib/actions";
import LeadsSelectableTable from "@/components/LeadsSelectableTable";

const PAGE_SIZE = 30;

export default async function NotContactedLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    added?: string;
    skipped?: string;
    error?: string;
    q?: string;
    city?: string;
    page?: string;
  }>;
}) {
  const { added, skipped, error, q, city, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const where = {
    status: "NEW",
    ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { shopNumber: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [totalCount, leads, rawCities] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.findMany({ where: { status: "NEW" }, select: { city: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const cityMap = new Map<string, string>();
  const cityCounts = new Map<string, number>();
  for (const { city: rawCity } of rawCities) {
    const trimmed = rawCity?.trim();
    if (!trimmed || trimmed === "-" || !/[a-zA-Z]/.test(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (!cityMap.has(key)) cityMap.set(key, trimmed);
    cityCounts.set(key, (cityCounts.get(key) ?? 0) + 1);
  }
  const allCities = Array.from(cityMap.entries())
    .map(([key, city]) => ({ city, count: cityCounts.get(key) ?? 0 }))
    .sort((a, b) => a.city.localeCompare(b.city));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Not Contacted</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} shop{totalCount === 1 ? "" : "s"} waiting to be contacted
          </p>
        </div>
        <Link
          href="/leads/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add Shop
        </Link>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {(added !== undefined || skipped !== undefined) && (
        <div className="alert alert-success">
          {added} lead{added === "1" ? "" : "s"} added, {skipped} skipped (duplicate or missing fields).
        </div>
      )}

      {/* Search + filter */}
      <form method="GET" className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 20 20">
            <path d="M8.5 15A6.5 6.5 0 1 0 8.5 2a6.5 6.5 0 0 0 0 13ZM18 18l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search shop, name or phone…"
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition-colors"
          />
        </div>
        <div className="relative">
          <select
            name="city"
            defaultValue={city ?? ""}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
          >
            <option value="">All Cities</option>
            {allCities.map((c) => (
              <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 20 20">
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Search
        </button>
        {(q || city) && (
          <Link href="/leads/not-contacted" className="flex items-center text-sm text-gray-400 hover:text-black transition-colors px-2">
            Clear
          </Link>
        )}
      </form>

      {/* Active filters */}
      {(q || city) && (
        <div className="flex flex-wrap items-center gap-2">
          {q && (
            <Link href={{ pathname: "/leads/not-contacted", query: city ? { city } : {} }} className="filter-chip">
              "{q}" <span className="filter-chip-x">×</span>
            </Link>
          )}
          {city && (
            <Link href={{ pathname: "/leads/not-contacted", query: q ? { q } : {} }} className="filter-chip">
              {city} <span className="filter-chip-x">×</span>
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {leads.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No shops found.</p>
          {(q || city) && (
            <Link href="/leads/not-contacted" className="mt-2 inline-block text-sm font-medium text-black hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <LeadsSelectableTable
          leads={leads}
          contactedAction={markLeadContacted}
          deleteAction={deleteLead}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={{ pathname: "/leads/not-contacted", query: { ...(q ? { q } : {}), ...(city ? { city } : {}), page: currentPage - 1 } }}
                className="border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={{ pathname: "/leads/not-contacted", query: { ...(q ? { q } : {}), ...(city ? { city } : {}), page: currentPage + 1 } }}
                className="border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
