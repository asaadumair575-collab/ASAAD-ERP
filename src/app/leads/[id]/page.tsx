import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markLeadContacted, deleteLead, convertLeadToClient, cancelLead } from "@/lib/actions";
import { toLocalDateStr } from "@/lib/tz";
import SubmitButton from "@/components/SubmitButton";
import ConfirmClientModal from "@/components/ConfirmClientModal";
import DeleteButton from "@/components/DeleteButton";
import ContactReasonModal from "@/components/ContactReasonModal";

const statusStyles: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  SAMPLE_SENT: "bg-blue-50 text-blue-700 border border-blue-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
  CONFIRMED: "bg-black text-white",
};

const statusLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SAMPLE_SENT: "Sample Sent",
  CANCELLED: "Cancelled",
  CONFIRMED: "Confirmed",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = parseInt(id, 10);
  if (isNaN(leadId)) notFound();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { samples: { orderBy: { dateSent: "desc" } } },
  });

  if (!lead) notFound();

  const contactBound = markLeadContacted.bind(null, lead.id);
  const deleteBound = deleteLead.bind(null, lead.id);
  const convertBound = convertLeadToClient.bind(null, lead.id);
  const cancelBound = cancelLead.bind(null, lead.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lead.name || "-"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Shop #{lead.shopNumber || "-"} &middot; {lead.city || "-"}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[lead.status]}`}
        >
          {statusLabels[lead.status]}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Phone
        </p>
        <p className="text-sm text-gray-800">{lead.phone ?? "-"}</p>
        {lead.notes && (
          <>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2">
              Notes
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-line">
              {lead.notes}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {lead.status === "NEW" && (
          <ContactReasonModal action={contactBound} />
        )}
        {(lead.status === "NEW" || lead.status === "CONTACTED") && (
          <Link
            href={`/samples/new?leadId=${lead.id}`}
            className="border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Send Sample
          </Link>
        )}
        {lead.status === "CONTACTED" && (
          <form action={cancelBound}>
            <SubmitButton
              pendingText="Cancelling..."
              className="border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Cancel Client
            </SubmitButton>
          </form>
        )}
        {(lead.status === "CONTACTED" || lead.status === "SAMPLE_SENT") && (
          <ConfirmClientModal
            confirmAction={convertBound}
            defaultName={lead.name}
            triggerLabel="Confirm as Customer"
            triggerClassName="bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          />
        )}
        <DeleteButton action={deleteBound} message="This lead will be permanently deleted." />
      </div>

      <div>
        <h2 className="text-sm font-medium mb-3">Samples Sent</h2>
        {lead.samples.length === 0 ? (
          <p className="text-sm text-gray-500">No samples sent yet.</p>
        ) : (
          <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100">
            {lead.samples.map((s) => (
              <Link
                key={s.id}
                href={`/samples/${s.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-700 truncate max-w-xs">
                  {s.description}
                </span>
                <span className="text-gray-400">
                  {toLocalDateStr(new Date(s.dateSent))}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
