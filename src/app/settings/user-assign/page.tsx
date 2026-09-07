import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UserAssignPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Settings</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">User Assign</h1>
        <p className="text-sm text-gray-400 mt-0.5">New user access system — in progress</p>
      </div>

      <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
        <p className="text-sm font-medium text-gray-500">Coming soon</p>
        <p className="text-xs text-gray-400 mt-1">The existing Users page keeps working while this is built.</p>
      </div>
    </div>
  );
}
