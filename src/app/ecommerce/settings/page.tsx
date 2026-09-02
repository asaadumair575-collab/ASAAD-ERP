import { prisma } from "@/lib/prisma";
import { saveAppSetting } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import DeleteAllEcomOrdersButton from "@/components/DeleteAllEcomOrdersButton";

export default async function EcomSettingsPage() {
  const me = await getSessionUser();
  const postexKey = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
  const ecomOrderCount = me?.isAdmin ? await prisma.ecomOrder.count() : 0;

  const savePostex = saveAppSetting.bind(null, "POSTEX_API_KEY");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ecommerce Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">API keys and integrations</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">PostEx API Key</p>
          <p className="text-xs text-gray-400 mt-0.5">Used for auto-sync of order statuses (returns, delivery charges)</p>
        </div>
        <form action={savePostex} className="flex gap-2">
          <input
            name="value"
            type="text"
            defaultValue={postexKey?.value ?? ""}
            placeholder="Paste PostEx API token here"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            Save
          </button>
        </form>
        {postexKey && (
          <p className="text-xs text-green-600">✓ Key saved · {postexKey.value.slice(0, 8)}...{postexKey.value.slice(-4)}</p>
        )}
      </div>

      {me?.isAdmin && (
        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-semibold text-red-700">Danger Zone</p>
            <p className="text-xs text-gray-400 mt-0.5">Irreversible actions scoped to Retail COD only</p>
          </div>
          <DeleteAllEcomOrdersButton orderCount={ecomOrderCount} />
        </div>
      )}
    </div>
  );
}
