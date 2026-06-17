import { prisma } from "@/lib/prisma";
import { updateClient } from "@/lib/actions";
import { notFound } from "next/navigation";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = parseInt(id, 10);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) notFound();

  const updateClientForId = updateClient.bind(null, clientId);

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Edit Client</h1>
      <form action={updateClientForId} className="space-y-4">
        <Field label="Name" name="name" defaultValue={client.name} required />
        <Field label="City" name="city" defaultValue={client.city} required />
        <Field label="Phone" name="phone" defaultValue={client.phone ?? ""} />
        <Field
          label="Address"
          name="address"
          defaultValue={client.address ?? ""}
        />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
      />
    </div>
  );
}
