import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cancelLead, deleteLead, convertLeadToClient } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import WhatsAppButton from "@/components/WhatsAppButton";
import ConfirmClientModal from "@/components/ConfirmClientModal";
import DeleteButton from "@/components/DeleteButton";

const PAGE_SIZE = 30;

// The employee's first call filters shops into "Interested" — this page is
// the senior's own call queue: everyone who said yes, waiting for the
// senior's personal follow-up call to actually close them.
export default async function DealInProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const me = await getSessionUser();

  const totalCount = await prisma.lead.count({ where: { status: "INTERESTED" } });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const leads = await prisma.lead.findMany({
    where: { status: "INTERESTED" },
    orderBy: { contactedAt: "asc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { contactedBy: { select: { displayName: true, username: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal in Process</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} shop{totalCount === 1 ? "" : "s"} said yes to your team — call them yourself to close
          </p>
        </div>
        <Link href="/leads/contacted" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
          Contacted →
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No deals in process waiting on your call.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Shop Name</th>
                <th className="py-3 px-5">Number</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5">Called By</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((l) => {
                const cancelBound = cancelLead.bind(null, l.id);
                const deleteBound = deleteLead.bind(null, l.id);
                const confirmBound = convertLeadToClient.bind(null, l.id);
                return (
                  <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5 font-medium">
                      <Link href={`/leads/${l.id}`} className="hover:underline">{l.shopNumber || "-"}</Link>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{l.phone || "-"}</td>
                    <td className="py-3 px-5 text-gray-500">{l.city || "-"}</td>
                    <td className="py-3 px-5 text-gray-500 text-xs">
                      {l.contactedBy?.displayName ?? l.contactedBy?.username ?? "-"}
                      {l.contactedAt && (
                        <span className="block text-gray-400">
                          {l.contactedAt.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short" })}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5"><WhatsAppButton phone={l.phone} /></td>
                    <td className="py-3 px-5 text-right">
                      <Link href={`/samples/new?leadId=${l.id}`} className="text-xs font-medium text-gray-500 hover:text-black transition-colors">
                        Sample Sent
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <ConfirmClientModal confirmAction={confirmBound} defaultName={l.name} />
                    </td>
                    <td className="py-3 px-5 text-right">
                      <form action={cancelBound}>
                        <button type="submit" className="text-xs font-medium text-gray-400 hover:text-red-600 transition-colors">
                          Cancel
                        </button>
                      </form>
                    </td>
                    <td className="py-3 px-5 text-right">
                      {me?.isAdmin && <DeleteButton action={deleteBound} />}
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
              <Link href={{ pathname: "/leads/deal-in-process", query: { page: currentPage - 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={{ pathname: "/leads/deal-in-process", query: { page: currentPage + 1 } }}
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
