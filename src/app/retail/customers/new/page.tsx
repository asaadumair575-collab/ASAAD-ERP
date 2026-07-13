import { createRetailCustomer } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default function NewRetailCustomerPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Retail Customer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Customer add karo retail / COD orders ke liye.</p>
      </div>

      <form action={createRetailCustomer} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Name <span className="text-black">*</span></label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Ahmed Raza"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Phone</label>
            <input
              type="tel"
              name="phone"
              placeholder="03xx-xxxxxxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">City</label>
            <input
              type="text"
              name="city"
              placeholder="e.g. Lahore"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Notes (optional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Koi extra info..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <SubmitButton
          pendingText="Saving..."
          className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Save Customer
        </SubmitButton>
      </form>
    </div>
  );
}
