import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteSample, convertLeadToClient, cancelLeadFromSample } from "@/lib/actions";
import CancelLeadModal from "@/components/CancelLeadModal";
import ConfirmClientModal from "@/components/ConfirmClientModal";

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  ACCEPTED: "bg-black text-white",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
  NO_RESPONSE: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  NO_RESPONSE: "No Response",
};

export default async function SamplesPage() {
  const samples = await prisma.sample.findMany({
    include: { client: true, lead: true },
    orderBy: { dateSent: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Samples</h1>
          <p className="text-sm text-gray-500 mt-1">
            {samples.length} sample{samples.length === 1 ? "" : "s"} sent
          </p>
        </div>
        <Link
          href="/samples/new"
          className="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Log Sample
        </Link>
      </div>

      {samples.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No samples logged yet.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Customer</th>
                <th className="py-3 px-5 font-medium">Description</th>
                <th className="py-3 px-5 font-medium">Date Sent</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {samples.map((s) => {
                const deleteSampleBound = deleteSample.bind(null, s.id);
                const confirmBound = s.leadId
                  ? convertLeadToClient.bind(null, s.leadId)
                  : null;
                const cancelBound = s.leadId
                  ? cancelLeadFromSample.bind(null, s.leadId)
                  : null;
                return (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-5">
                    <Link
                      href={`/samples/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.client?.name ?? s.lead?.name}
                    </Link>
                    {s.lead && (
                      <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Lead
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-gray-600 max-w-xs truncate">
                    {s.description}
                  </td>
                  <td className="py-3 px-5 text-gray-600">
                    {s.dateSent.toISOString().slice(0, 10)}
                  </td>
                  <td className="py-3 px-5">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[s.status]}`}
                    >
                      {statusLabels[s.status]}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    {confirmBound && (
                      <ConfirmClientModal
                        confirmAction={confirmBound}
                        defaultName={s.lead?.name}
                      />
                    )}
                  </td>
                  <td className="py-3 px-5 text-right">
                    {cancelBound && <CancelLeadModal cancelAction={cancelBound} />}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <form action={deleteSampleBound}>
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
