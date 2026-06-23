import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { uploadLeads, setLeadStatus, deleteLead } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

const statusStyles: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  SAMPLE_SENT: "bg-blue-50 text-blue-700 border border-blue-200",
  CONFIRMED: "bg-black text-white",
};

const statusLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SAMPLE_SENT: "Sample Sent",
  CONFIRMED: "Confirmed",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; skipped?: string; error?: string }>;
}) {
  const { added, skipped, error } = await searchParams;

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} lead{leads.length === 1 ? "" : "s"} not yet confirmed
          </p>
        </div>
        <Link
          href="/leads/new"
          className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add Lead
        </Link>
      </div>

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

      <form
        action={uploadLeads}
        encType="multipart/form-data"
        className="border border-gray-200 rounded-2xl p-5 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Upload CSV or Excel (Shop Number/Name, Name, City, Phone/Contact)
          </label>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="text-sm"
          />
        </div>
        <SubmitButton
          pendingText="Uploading..."
          className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Upload
        </SubmitButton>
      </form>

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No leads yet.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Shop #</th>
                <th className="py-3 px-5 font-medium">Name</th>
                <th className="py-3 px-5 font-medium">City</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l) => {
                const contactBound = setLeadStatus.bind(null, l.id, "CONTACTED");
                const deleteBound = deleteLead.bind(null, l.id);
                return (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 font-medium">
                      <Link href={`/leads/${l.id}`} className="hover:underline">
                        {l.shopNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-600">{l.name}</td>
                    <td className="py-3 px-5 text-gray-600">{l.city}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[l.status]}`}
                      >
                        {statusLabels[l.status]}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      {l.status === "NEW" && (
                        <form action={contactBound}>
                          <button
                            type="submit"
                            className="text-xs font-medium text-gray-500 hover:text-black transition-colors"
                          >
                            Mark Contacted
                          </button>
                        </form>
                      )}
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
    </div>
  );
}
