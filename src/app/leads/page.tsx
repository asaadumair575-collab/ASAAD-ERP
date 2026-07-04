import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { markLeadContacted, deleteLead } from "@/lib/actions";
import LeadsTable from "@/components/LeadsTable";

const PAGE_SIZE = 30;

const TABS = [
  { status: "",           label: "All" },
  { status: "NEW",        label: "Not Contacted" },
  { status: "CONTACTED",  label: "Contacted" },
  { status: "SAMPLE_SENT",label: "Sample Sent" },
  { status: "CANCELLED",  label: "Cancelled" },
];

const STATUS_LABELS: Record<string, string> = {
  NEW: "Not Contacted",
  CONTACTED: "Contacted",
  SAMPLE_SENT: "Sample Sent",
  CANCELLED: "Cancelled",
  CONFIRMED: "Confirmed",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    city?: string;
    page?: string;
    added?: string;
    skipped?: string;
    error?: string;
  }>;
}) {
  const { q, status, city, page, added, skipped, error } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const where = {
    ...(status ? { status } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { shopNumber: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { city: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [totalCount, leads, allLeadsForCities, tabCounts, totalLeads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.findMany({ select: { city: true }, distinct: ["city"] }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const countByStatus: Record<string, number> = {};
  for (const row of tabCounts) countByStatus[row.status] = row._count;

  const citySet = new Set<string>();
  for (const { city: c } of allLeadsForCities) {
    const t = c?.trim();
    if (t && t !== "-" && /[a-zA-Z]/.test(t)) citySet.add(t);
  }
  const allCities = Array.from(citySet).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalLeads.toLocaleString()} lead{totalLeads === 1 ? "" : "s"} in your pipeline
          </p>
        </div>
        <Link
          href="/leads/new"
          className="shrink-0 flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Add Lead
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {TABS.map((tab) => {
          const count = tab.status === "" ? totalLeads : (countByStatus[tab.status] ?? 0);
          const isActive = (status ?? "") === tab.status;
          return (
            <Link
              key={tab.status}
              href={{ pathname: "/leads", query: { ...(tab.status ? { status: tab.status } : {}), ...(q ? { q } : {}), ...(city ? { city } : {}) } }}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-black text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {count.toLocaleString()}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Search + city filter */}
      <form method="GET" className="flex flex-wrap gap-2 items-center">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search shop name, phone, city..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
          />
        </div>
        <div className="relative">
          <select
            name="city"
            defaultValue={city ?? ""}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black shadow-sm cursor-pointer"
          >
            <option value="">All Cities</option>
            {allCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 20 20">
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
          Search
        </button>
        {(q || city) && (
          <Link href={{ pathname: "/leads", query: status ? { status } : {} }} className="text-sm text-gray-500 hover:text-black transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Active filter chips */}
      {(q || city) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">
            {totalCount.toLocaleString()} result{totalCount === 1 ? "" : "s"}
          </span>
          {q && (
            <Link href={{ pathname: "/leads", query: { status, city } }} className="filter-chip">
              &ldquo;{q}&rdquo;<span className="filter-chip-x">×</span>
            </Link>
          )}
          {city && (
            <Link href={{ pathname: "/leads", query: { status, q } }} className="filter-chip">
              {city}<span className="filter-chip-x">×</span>
            </Link>
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {(added !== undefined || skipped !== undefined) && (
        <div className="alert alert-success">
          {added} lead{added === "1" ? "" : "s"} added, {skipped} skipped (duplicate or missing fields).
        </div>
      )}

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center space-y-2">
          <p className="text-gray-400 text-sm">No leads found.</p>
          {(q || city || status) ? (
            <Link href="/leads" className="text-sm font-medium text-black hover:underline">Clear filters</Link>
          ) : (
            <Link href="/leads/new" className="text-sm font-medium text-black hover:underline">Add your first lead →</Link>
          )}
        </div>
      ) : (
        <LeadsTable leads={leads} contactAction={markLeadContacted} deleteAction={deleteLead} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {currentPage} of {totalPages} · {totalCount.toLocaleString()} total</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={{ pathname: "/leads", query: { q, status, city, page: currentPage - 1 } }} className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={{ pathname: "/leads", query: { q, status, city, page: currentPage + 1 } }} className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
