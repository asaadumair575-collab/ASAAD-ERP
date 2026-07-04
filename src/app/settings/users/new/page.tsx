import { getSessionUser } from "@/lib/auth";
import { createUser } from "@/lib/actions";
import { MODULES } from "@/lib/permissions";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewUserPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/users" className="text-gray-400 hover:text-black transition-colors">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New User</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a login account with custom access.</p>
        </div>
      </div>

      <form action={createUser} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">Account Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Username <span className="text-black">*</span></label>
              <input type="text" name="username" required autoComplete="off"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Display Name</label>
              <input type="text" name="displayName"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Password <span className="text-black">*</span></label>
            <input type="password" name="password" required minLength={6} autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            <p className="text-xs text-gray-400 mt-1">Min. 6 characters</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" name="isAdmin" value="1" className="w-4 h-4 accent-black rounded" />
            <span className="text-sm">Admin — full access to everything including Settings</span>
          </label>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Module Permissions</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ignored if user is Admin.</p>
          </div>
          <div className="space-y-1">
            {MODULES.map((m) => (
              <div key={m.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{m.label}</span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(["none", "view", "full"] as const).map((level) => (
                    <label key={level} className="relative cursor-pointer">
                      <input type="radio" name={`perm_${m.key}`} value={level} defaultChecked={level === "none"} className="sr-only peer" />
                      <span className="block px-3 py-1 text-xs font-medium rounded-md transition-colors text-gray-500 peer-checked:bg-white peer-checked:text-black peer-checked:shadow-sm capitalize">
                        {level}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/settings/users" className="flex-1 text-center border border-gray-200 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <SubmitButton pendingText="Creating..." className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
            Create User
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
