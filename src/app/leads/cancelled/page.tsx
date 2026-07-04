import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteLead } from "@/lib/actions";
import WhatsAppButton from "@/components/WhatsAppButton";
import DeleteButton from "@/components/DeleteButton";

const PAGE_SIZE = 30;

export default async function CancelledLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const totalCount = await prisma.lead.count({ where: { status: "CANCELLED" } });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const leads = await prisma.lead.findMany({
    where: { status: "CANCELLED" },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cancelled</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} shop{totalCount === 1 ? "" : "s"} cancelled
          </p>
        </div>
        <Link href="/leads/contacted" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
          ← Contacted
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No cancelled shops.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Shop Name</th>
                <th className="py-3 px-5">Number</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((l) => {
                const deleteBound = deleteLead.bind(null, l.id);
                return (
                  <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5 font-medium">
                      <Link href={`/leads/${l.id}`} className="hover:underline">{l.shopNumber || "-"}</Link>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{l.phone || "-"}</td>
                    <td className="py-3 px-5 text-gray-500">{l.city || "-"}</td>
                    <td className="py-3 px-5"><WhatsAppButton phone={l.phone} /></td>
                    <td className="py-3 px-5 text-right">
                      <DeleteButton action={deleteBound} />
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
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={{ pathname: "/leads/cancelled", query: { page: currentPage - 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={{ pathname: "/leads/cancelled", query: { page: currentPage + 1 } }}
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
