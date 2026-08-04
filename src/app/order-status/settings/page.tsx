import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import SubmitButton from "@/components/SubmitButton";

async function savePostexKey(formData: FormData) {
  "use server";
  const { getSessionUser: getUser } = await import("@/lib/auth");
  const me = await getUser();
  if (!me?.isAdmin) throw new Error("Unauthorized");
  const value = String(formData.get("postexKey") ?? "").trim();
  if (!value) return;
  const { prisma: db } = await import("@/lib/prisma");
  await db.appSetting.upsert({
    where: { key: "POSTEX_API_KEY" },
    create: { key: "POSTEX_API_KEY", value },
    update: { value },
  });
  revalidatePath("/order-status");
  revalidatePath("/order-status/settings");
}

export default async function OrderStatusSettingsPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/order-status");

  const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
  const currentKey = process.env.POSTEX_API_KEY || setting?.value || "";

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Order Status — Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configure courier API keys</p>
      </div>

      {/* PostEx */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">PX</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">PostEx</p>
            <p className="text-xs text-gray-400">Used for both Retail COD and Retail Advance orders</p>
          </div>
          {currentKey && (
            <span className="ml-auto text-[10px] font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">✓ Configured</span>
          )}
        </div>

        <form action={savePostexKey} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">API Token</label>
            <input
              type="text"
              name="postexKey"
              placeholder={currentKey ? "Already set — paste new token to update" : "Paste your PostEx API token here"}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              PostEx dashboard → API Integration → copy the token
            </p>
          </div>
          <SubmitButton className="bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
            Save
          </SubmitButton>
        </form>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">What this enables</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Employees can check live order/shipment status by tracking number</li>
          <li>Works for both COD and Retail Advance orders on PostEx</li>
          <li>Key is stored securely in the database (not in code)</li>
        </ul>
      </div>
    </div>
  );
}
