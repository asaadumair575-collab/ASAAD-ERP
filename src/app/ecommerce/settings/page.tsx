import { prisma } from "@/lib/prisma";
import { saveAppSetting } from "@/lib/actions";

export default async function EcomSettingsPage() {
  const postexKey = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });

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
    </div>
  );
}
