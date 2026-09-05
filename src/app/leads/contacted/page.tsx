import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cancelLead, deleteLead, convertLeadToClient } from "@/lib/actions";
import WhatsAppButton from "@/components/WhatsAppButton";
import SubmitButton from "@/components/SubmitButton";
import ConfirmClientModal from "@/components/ConfirmClientModal";
import DeleteButton from "@/components/DeleteButton";

const PAGE_SIZE = 30;

export default async function ContactedLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const totalCount = await prisma.lead.count({ where: { status: "CONTACTED" } });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const leads = await prisma.lead.findMany({
    where: { status: "CONTACTED" },
    orderBy: { contactedAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { contactedBy: { select: { displayName: true, username: true } } },
  });

  // The call outcome is stored as the last "Contacted: <reason>" line in
  // notes — pull it back out so admin can review what happened on the call
  // without opening each lead individually.
  function callResult(notes: string | null) {
    if (!notes) return null;
    const lines = notes.split("\n").filter((l) => l.startsWith("Contacted: "));
    return lines.length ? lines[lines.length - 1].replace("Contacted: ", "") : null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacted Shops</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} lead{totalCount === 1 ? "" : "s"} marked contacted
          </p>
        </div>
        <Link href="/leads/not-contacted" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
          ← Not Contacted
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No contacted shops yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Shop Name</th>
                <th className="py-3 px-5">Number</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5">Call Result</th>
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
                    <td className="py-3 px-5">
                      {callResult(l.notes) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {callResult(l.notes)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
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
              <Link href={{ pathname: "/leads/contacted", query: { page: currentPage - 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={{ pathname: "/leads/contacted", query: { page: currentPage + 1 } }}
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
