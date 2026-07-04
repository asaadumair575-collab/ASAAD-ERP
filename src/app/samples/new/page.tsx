import { prisma } from "@/lib/prisma";
import { createSample } from "@/lib/actions";
import SampleForm from "@/components/SampleForm";

export default async function NewSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId: leadIdRaw } = await searchParams;
  const leadId = leadIdRaw ? parseInt(leadIdRaw, 10) : null;

  const leadRecord = leadId
    ? await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, name: true, shopNumber: true },
      })
    : null;
  const lead = leadRecord
    ? { ...leadRecord, name: leadRecord.name ?? leadRecord.shopNumber }
    : null;

  const clients = lead
    ? []
    : await prisma.client.findMany({
        select: { id: true, name: true, businessName: true },
        orderBy: { name: "asc" },
      });

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log a Sample</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {lead
            ? `Record a sample sent to lead ${lead.name}.`
            : "Record a sample sent to a customer."}
        </p>
      </div>
      <SampleForm action={createSample} clients={clients} lead={lead ?? undefined} />
    </div>
  );
}
