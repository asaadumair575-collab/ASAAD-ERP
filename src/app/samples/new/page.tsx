import { prisma } from "@/lib/prisma";
import { createSample } from "@/lib/actions";
import SampleForm from "@/components/SampleForm";

export default async function NewSamplePage() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, businessName: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Log a Sample</h1>
        <p className="text-sm text-gray-500 mt-1">
          Record a sample sent to a customer.
        </p>
      </div>
      <SampleForm action={createSample} clients={clients} />
    </div>
  );
}
