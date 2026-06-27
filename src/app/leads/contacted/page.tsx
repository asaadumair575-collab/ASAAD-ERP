import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cancelLead, deleteLead } from "@/lib/actions";

export default async function ContactedLeadsPage() {
  const leads = await prisma.lead.findMany({
    where: { status: "CONTACTED" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Contacted Shops
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} lead{leads.length === 1 ? "" : "s"} marked
            contacted
          </p>
        </div>
        <Link
          href="/leads/not-contacted"
          className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          Back to Not Contacted
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No contacted shops yet.</p>
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
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l) => {
                const cancelBound = cancelLead.bind(null, l.id);
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
                      <Link
                        href={`/samples/new?leadId=${l.id}`}
                        className="text-xs font-medium text-gray-500 hover:text-black transition-colors"
                      >
                        Sample Sent
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <form action={cancelBound}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                        >
                          Cancel Client
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
    </div>
  );
}
