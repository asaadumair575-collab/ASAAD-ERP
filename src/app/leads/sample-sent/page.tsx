import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { convertLeadToClient, deleteLead, createLeadSample } from "@/lib/actions";
import WhatsAppButton from "@/components/WhatsAppButton";
import ConfirmClientModal from "@/components/ConfirmClientModal";
import DeleteButton from "@/components/DeleteButton";
import SubmitButton from "@/components/SubmitButton";
import LeadSearchSelect from "@/components/LeadSearchSelect";

const PAGE_SIZE = 30;

export default async function SampleSentLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const [totalCount, leads, contactedLeads] = await Promise.all([
    prisma.lead.count({ where: { status: "SAMPLE_SENT" } }),
    prisma.lead.findMany({
      where: { status: "SAMPLE_SENT" },
      include: { samples: { orderBy: { dateSent: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.findMany({
      select: { id: true, shopNumber: true, name: true, city: true },
      orderBy: { shopNumber: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Samples</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} shop{totalCount === 1 ? "" : "s"} with sample sent
          </p>
        </div>
      </div>

      {/* Add Sample Entry */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Add Sample Entry</h2>
        <form action={createLeadSample} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-500 mb-1.5">Lead / Shop</label>
            <LeadSearchSelect leads={contactedLeads} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1.5">Sample Description</label>
            <input
              type="text"
              name="description"
              required
              placeholder="e.g. Cotton Balls 100g"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Date Sent</label>
            <input
              type="date"
              name="dateSent"
              defaultValue={today}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition-colors"
            />
          </div>
          <SubmitButton className="bg-black text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            + Add Sample
          </SubmitButton>
        </form>
        {contactedLeads.length === 0 && (
          <p className="text-xs text-gray-400">No leads found — add a lead first.</p>
        )}
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No samples sent yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Shop</th>
                <th className="py-3 px-5">Sample</th>
                <th className="py-3 px-5">Date Sent</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((l) => {
                const confirmBound = convertLeadToClient.bind(null, l.id);
                const deleteBound = deleteLead.bind(null, l.id);
                const lastSample = l.samples[0];
                return (
                  <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5 font-medium">
                      <Link href={`/leads/${l.id}`} className="hover:underline">{l.shopNumber || "-"}</Link>
                      {l.name && <p className="text-xs text-gray-400 mt-0.5">{l.name}</p>}
                    </td>
                    <td className="py-3 px-5 text-gray-600">
                      {lastSample?.description ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-5 text-gray-500">
                      {lastSample ? lastSample.dateSent.toISOString().slice(0, 10) : "—"}
                    </td>
                    <td className="py-3 px-5 text-gray-500">{l.city || "-"}</td>
                    <td className="py-3 px-5"><WhatsAppButton phone={l.phone} /></td>
                    <td className="py-3 px-5 text-right">
                      <ConfirmClientModal confirmAction={confirmBound} defaultName={l.name} />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={{ pathname: "/leads/sample-sent", query: { page: currentPage - 1 } }}
                className="border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={{ pathname: "/leads/sample-sent", query: { page: currentPage + 1 } }}
                className="border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
