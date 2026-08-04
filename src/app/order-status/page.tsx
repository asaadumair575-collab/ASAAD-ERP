import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import OrderStatusClient from "./OrderStatusClient";

export default async function OrderStatusPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
  const hasApiKey = !!(process.env.POSTEX_API_KEY || setting?.value);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Order Status Check</h1>
        <p className="text-xs text-gray-400 mt-0.5">Track orders via PostEx courier</p>
      </div>

      {!hasApiKey ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm text-amber-800">
          PostEx API key set nahi ha. Admin se Settings → Order Status me API key daalne ko kahen.
        </div>
      ) : (
        <OrderStatusClient />
      )}
    </div>
  );
}
