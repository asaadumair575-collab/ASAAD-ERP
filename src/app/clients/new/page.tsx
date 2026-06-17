import { createClient } from "@/lib/actions";

export default function NewClientPage() {
  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add Client</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter the client's details below.
        </p>
      </div>
      <form action={createClient} className="space-y-4">
        <Field label="Name" name="name" required />
        <Field label="Business / Shop Name" name="businessName" />
        <Field label="City" name="city" required />
        <Field label="Phone" name="phone" />
        <Field label="Address" name="address" />
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Save Client
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
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
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  );
}
