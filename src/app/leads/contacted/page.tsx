import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteLead } from "@/lib/actions";

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
          href="/leads"
          className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          Back to All Leads
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
                <th className="py-3 px-5 font-medium">Shop #</th>
                <th className="py-3 px-5 font-medium">Name</th>
                <th className="py-3 px-5 font-medium">City</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l) => {
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
