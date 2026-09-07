import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createUserAssign } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function NewUserAssignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  const { error } = await searchParams;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/user-assign" className="text-gray-400 hover:text-black transition-colors">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Create New User</h1>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <form action={createUserAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Username</label>
            <input
              type="text"
              name="username"
              required
              autoFocus
              placeholder="e.g. anas"
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Display Name (optional)</label>
            <input
              type="text"
              name="displayName"
              placeholder="e.g. Anas"
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <p className="text-xs text-gray-400">
            No password here — when this user first opens their account, they&apos;ll be asked to set their own password.
          </p>
          <SubmitButton
            pendingText="Creating..."
            className="w-full bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Create User
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
