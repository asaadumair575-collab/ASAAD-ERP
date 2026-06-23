import { createLead } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default function NewLeadPage() {
  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add Lead</h1>
        <p className="text-sm text-gray-500 mt-1">
          Log a prospective customer to reach out to.
        </p>
      </div>

      <form
        action={createLead}
        className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Shop Number<span className="text-black"> *</span>
          </label>
          <input
            type="text"
            name="shopNumber"
            required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Name<span className="text-black"> *</span>
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            City<span className="text-black"> *</span>
          </label>
          <input
            type="text"
            name="city"
            required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Phone
          </label>
          <input
            type="text"
            name="phone"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
          />
        </div>
        <div className="flex justify-end pt-2">
          <SubmitButton
            pendingText="Saving..."
            className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            Save Lead
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
