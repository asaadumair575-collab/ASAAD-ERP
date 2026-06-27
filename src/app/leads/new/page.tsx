import { createLead, uploadLeads } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import AddShopTabs from "@/components/AddShopTabs";

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string; skipped?: string }>;
}) {
  const { error, added, skipped } = await searchParams;

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add Shop</h1>
        <p className="text-sm text-gray-500 mt-1">
          Log a prospective customer to reach out to.
        </p>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(added !== undefined || skipped !== undefined) && (
        <div className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700">
          {added} lead{added === "1" ? "" : "s"} added, {skipped} skipped
          (duplicate or missing fields).
        </div>
      )}

      <AddShopTabs
        manual={
          <form
            action={createLead}
            className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Shop Name<span className="text-black"> *</span>
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
                Person Name
              </label>
              <input
                type="text"
                name="name"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Contact<span className="text-black"> *</span>
              </label>
              <input
                type="text"
                name="phone"
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
        }
        csv={
          <form
            action={uploadLeads}
            encType="multipart/form-data"
            className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Upload CSV or Excel
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Columns: Shop Name, Contact (required), Person Name (optional), City
              </p>
              <input
                type="file"
                name="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="text-sm"
              />
            </div>
            <div className="flex justify-end pt-2">
              <SubmitButton
                pendingText="Uploading..."
                className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
              >
                Upload
              </SubmitButton>
            </div>
          </form>
        }
      />
    </div>
  );
}
