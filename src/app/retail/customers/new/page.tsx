import { createRetailCustomer } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function NewRetailCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; phone?: string; city?: string; address?: string; fromDraft?: string }>;
}) {
  const params = await searchParams;
  const fromDraft = params.fromDraft === "1";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Retail Customer</h1>
        {fromDraft ? (
          <p className="text-sm text-green-600 mt-0.5 font-medium">✓ Details pre-filled from draft — confirm and save</p>
        ) : (
          <p className="text-sm text-gray-500 mt-0.5">Add a customer for retail / COD orders.</p>
        )}
      </div>

      <form action={createRetailCustomer} className="space-y-5">
        <input type="hidden" name="fromDraft" value={fromDraft ? "1" : ""} />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Name <span className="text-black">*</span></label>
            <input
              type="text"
              name="name"
              required
              defaultValue={params.name ?? ""}
              placeholder="e.g. Ahmed Raza"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Phone <span className="text-black">*</span></label>
            <input
              type="tel"
              name="phone"
              required
              defaultValue={params.phone ?? ""}
              placeholder="03xx-xxxxxxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">City <span className="text-black">*</span></label>
            <input
              type="text"
              name="city"
              required
              defaultValue={params.city ?? ""}
              placeholder="e.g. Lahore"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Address</label>
            <input
              type="text"
              name="address"
              defaultValue={params.address ?? ""}
              placeholder="e.g. Street 5, Block B, Gulberg"
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
          {fromDraft ? "Save Customer & Create Order →" : "Save Customer"}
        </SubmitButton>
      </form>
    </div>
  );
}
