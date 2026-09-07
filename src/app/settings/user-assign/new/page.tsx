import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NewUserAssignPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/user-assign" className="text-gray-400 hover:text-black transition-colors">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Create New User</h1>
      </div>

      <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
        <p className="text-sm font-medium text-gray-500">Form coming next</p>
      </div>
    </div>
  );
}
