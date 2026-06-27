import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { markLeadContacted, deleteLead } from "@/lib/actions";

const PAGE_SIZE = 50;

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
    ...(city ? { city } : {}),
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

  const allCities = await prisma.lead.findMany({
    where: { status: "NEW" },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Not Contacted
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} shop{totalCount === 1 ? "" : "s"} waiting to be
            contacted
          </p>
        </div>
        <Link
          href="/leads/new"
          className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add Shop
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 items-end" method="get">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Search shop, name or contact
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
        {(q || city) && (
          <Link
            href="/leads/not-contacted"
            className="text-sm text-gray-500 hover:text-black px-2 py-2"
          >
            Clear
          </Link>
        )}
      </form>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(added !== undefined || skipped !== undefined) && (
        <div className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700">
          {added} lead{added === "1" ? "" : "s"} added, {skipped} skipped
          (duplicate or missing fields).
        </div>
      )}

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No shops waiting right now.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Shop Name</th>
                <th className="py-3 px-5 font-medium">Number</th>
                <th className="py-3 px-5 font-medium">City</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l) => {
                const contactBound = markLeadContacted.bind(null, l.id);
                const deleteBound = deleteLead.bind(null, l.id);
                return (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 font-medium">
                      <Link href={`/leads/${l.id}`} className="hover:underline">
                        {l.shopNumber || "-"}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-600">{l.phone || "-"}</td>
                    <td className="py-3 px-5 text-gray-600">{l.city || "-"}</td>
                    <td className="py-3 px-5 text-right">
                      <form action={contactBound}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-gray-500 hover:text-black transition-colors"
                        >
                          Mark Contacted
                        </button>
                      </form>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <form action={deleteBound}>
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
                  pathname: "/leads/not-contacted",
                  query: { q, city, page: currentPage - 1 },
                }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={{
                  pathname: "/leads/not-contacted",
                  query: { q, city, page: currentPage + 1 },
                }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next 50
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
