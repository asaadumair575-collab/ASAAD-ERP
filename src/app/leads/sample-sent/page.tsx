import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { convertLeadToClient, deleteLead } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

const PAGE_SIZE = 50;

export default async function SampleSentLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const totalCount = await prisma.lead.count({ where: { status: "SAMPLE_SENT" } });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const leads = await prisma.lead.findMany({
    where: { status: "SAMPLE_SENT" },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sample Sent
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} shop{totalCount === 1 ? "" : "s"} waiting to be
            confirmed
          </p>
        </div>
        <Link
          href="/leads/contacted"
          className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          Back to Contacted
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No samples sent yet.</p>
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
                const confirmBound = convertLeadToClient.bind(null, l.id);
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
                      <form action={confirmBound}>
                        <SubmitButton
                          pendingText="Confirming..."
                          className="text-xs font-medium text-black hover:underline"
                        >
                          Confirm Client
                        </SubmitButton>
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
                href={{ pathname: "/leads/sample-sent", query: { page: currentPage - 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={{ pathname: "/leads/sample-sent", query: { page: currentPage + 1 } }}
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
