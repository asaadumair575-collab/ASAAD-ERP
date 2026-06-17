import { createClient } from "@/lib/actions";

export default function NewClientPage() {
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Add Client</h1>
      <form action={createClient} className="space-y-4">
        <Field label="Name" name="name" required />
        <Field label="City" name="city" required />
        <Field label="Phone" name="phone" />
        <Field label="Address" name="address" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md"
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
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type="text"
        name={name}
        required={required}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
      />
    </div>
  );
}
