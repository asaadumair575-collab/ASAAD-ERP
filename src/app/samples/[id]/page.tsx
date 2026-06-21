import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { recordSampleResponse, deleteSample } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NO_RESPONSE", label: "No Response" },
];

export default async function SampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sampleId = parseInt(id, 10);

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: { client: true },
  });

  if (!sample) notFound();

  const recordResponseBound = recordSampleResponse.bind(null, sample.id);
  const deleteSampleBound = deleteSample.bind(null, sample.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {sample.client.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sample sent on {sample.dateSent.toISOString().slice(0, 10)}
          </p>
        </div>
        <form action={deleteSampleBound}>
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Sample Description
        </p>
        <p className="text-sm text-gray-800 whitespace-pre-line">
          {sample.description}
        </p>
      </div>

      <form
        action={recordResponseBound}
        className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6"
      >
        <h2 className="text-sm font-medium">Customer Response</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Status
          </label>
          <select
            name="status"
            defaultValue={sample.status}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Response Notes
          </label>
          <textarea
            name="response"
            rows={3}
            defaultValue={sample.response ?? ""}
            placeholder="What did the customer say?"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow placeholder:text-gray-400"
          />
        </div>

        {sample.responseDate && (
          <p className="text-xs text-gray-400">
            Last updated {sample.responseDate.toISOString().slice(0, 10)}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <SubmitButton
            pendingText="Saving..."
            className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            Save Response
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
