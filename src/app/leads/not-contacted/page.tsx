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

  const totalCount = await prisma.lead.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const rawCities = await prisma.lead.findMany({
    where: { status: "NEW" },
    select: { city: true },
  });
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Not Contacted</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} shop{totalCount === 1 ? "" : "s"} waiting to be contacted
          </p>
        </div>
        <Link
          href="/leads/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add Shop
        </Link>
      </div>

      <form
        className="flex flex-wrap gap-2 items-center"
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
            placeholder="Search shop, name or contact..."
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
        <button
          type="submit"
          className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Filter
        </button>
      </form>

      {(q || city) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active:</span>
          {q && (
            <Link href={{ pathname: "/leads/not-contacted", query: { city } }} className="filter-chip">
              Search: {q}<span className="filter-chip-x">×</span>
            </Link>
          )}
          {city && (
            <Link href={{ pathname: "/leads/not-contacted", query: { q } }} className="filter-chip">
              {city}<span className="filter-chip-x">×</span>
            </Link>
          )}
          <Link href="/leads/not-contacted" className="text-xs text-gray-400 hover:text-black transition-colors ml-1">
            Clear all
          </Link>
        </div>
      )}

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {(added !== undefined || skipped !== undefined) && (
        <div className="alert alert-success">
          {added} lead{added === "1" ? "" : "s"} added, {skipped} skipped (duplicate or missing fields).
        </div>
      )}

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center space-y-1">
          <p className="text-gray-400 text-sm">No shops waiting right now.</p>
          {(q || city) && (
            <Link href="/leads/not-contacted" className="text-sm font-medium text-black hover:underline">Clear filters</Link>
          )}
        </div>
      ) : (
        <LeadsSelectableTable
          leads={leads}
          contactedAction={markLeadContacted}
          deleteAction={deleteLead}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={{ pathname: "/leads/not-contacted", query: { q, city, page: currentPage - 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={{ pathname: "/leads/not-contacted", query: { q, city, page: currentPage + 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Next 30 →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
