import { prisma } from "@/lib/prisma";
import { updateClient } from "@/lib/actions";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";

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
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit Client</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update {client.name}'s details.
        </p>
      </div>
      <form action={updateClientForId} className="space-y-4">
        <Field label="Name" name="name" defaultValue={client.name} required />
        <Field
          label="Business / Shop Name"
          name="businessName"
          defaultValue={client.businessName ?? ""}
        />
        <Field label="City" name="city" defaultValue={client.city} required />
        <Field label="Phone" name="phone" defaultValue={client.phone ?? ""} />
        <Field
          label="Address"
          name="address"
          defaultValue={client.address ?? ""}
        />
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <SubmitButton className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          Save Changes
        </SubmitButton>
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
      <label className="block text-xs text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-black"> *</span>}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  );
}
