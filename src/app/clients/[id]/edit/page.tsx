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
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Customer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Update {client.name}&apos;s details below.
          </p>
        </div>
      </div>

      <form
        action={updateClientForId}
        className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6"
      >
        {/* Customer Type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Customer Type <span className="text-black">*</span></label>
          <div className="flex flex-wrap gap-3">
            {[
              { value: "WHOLESALER", label: "Wholesaler", desc: "Bulk buyer, credit orders" },
              { value: "SHOPKEEPER", label: "Shop Keeper", desc: "Retail shop, regular orders" },
              { value: "RETAIL", label: "Retail / COD", desc: "Small buyer, COD delivery" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                <input type="radio" name="customerType" value={opt.value}
                  defaultChecked={client.customerType === opt.value}
                  className="mt-0.5 accent-black" />
                <span>
                  <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                  <span className="block text-xs text-gray-400">{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Name"
            name="name"
            defaultValue={client.name}
            required
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0"
              />
            }
          />
          <Field
            label="Business / Shop Name"
            name="businessName"
            defaultValue={client.businessName ?? ""}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21V9.75L12 3l9 6.75V21M9 21v-6h6v6"
              />
            }
          />
          <Field
            label="City"
            name="city"
            defaultValue={client.city}
            required
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            }
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={client.phone ?? ""}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.5 1.5 0 00-1.077-1.439l-3.808-1.142a1.5 1.5 0 00-1.586.388l-.51.51a11.25 11.25 0 01-5.292-5.292l.51-.51a1.5 1.5 0 00.388-1.586L8.439 3.327A1.5 1.5 0 007 2.25H5.625A2.25 2.25 0 003.375 4.5"
              />
            }
          />
        </div>

        <Field
          label="Address"
          name="address"
          defaultValue={client.address ?? ""}
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          }
        />

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
            placeholder="Any additional notes about this customer..."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow placeholder:text-gray-400"
          />
        </div>

        <div className="flex justify-end pt-2">
          <SubmitButton
            pendingText="Saving..."
            className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            Save Changes
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  defaultValue,
  icon,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-black"> *</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-4 h-4"
          >
            {icon}
          </svg>
        </span>
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          className="w-full border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
        />
      </div>
    </div>
  );
}
