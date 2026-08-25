import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  updateUser,
  changeUserPassword,
  deleteUser,
  regenerateApiToken,
  revokeApiToken,
} from "@/lib/actions";
import { MODULES, SUB_MODULES, parsePermissions } from "@/lib/permissions";
import SubmitButton from "@/components/SubmitButton";
import DeleteButton from "@/components/DeleteButton";
import Link from "next/link";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  const { id } = await params;
  const userId = parseInt(id, 10);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const perms = parsePermissions(user.permissions);
  const updateBound = updateUser.bind(null, userId);
  const changePasswordBound = changeUserPassword.bind(null, userId);
  const deleteBound = deleteUser.bind(null, userId);
  const regenerateTokenBound = regenerateApiToken.bind(null, userId);
  const revokeTokenBound = revokeApiToken.bind(null, userId);

  const totalUsers = await prisma.user.count();

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/settings/users" className="text-gray-400 hover:text-black transition-colors">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.displayName || user.username}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">@{user.username}
              {user.id === me.id && <span className="ml-2">(you)</span>}
            </p>
          </div>
        </div>
        {totalUsers > 1 && (
          <DeleteButton
            action={deleteBound}
            label="Delete User"
            message={`@${user.username} will be permanently deleted and will no longer be able to log in.`}
          />
        )}
      </div>

      {/* Profile + Role */}
      <form action={updateBound} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Profile & Role</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Display Name</label>
          <input type="text" name="displayName" defaultValue={user.displayName ?? ""}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" name="isAdmin" value="1" defaultChecked={user.isAdmin} className="w-4 h-4 accent-black rounded" />
          <span className="text-sm">Admin — full access to everything including Settings</span>
        </label>

        <div className="pt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Module Permissions</h3>
            <p className="text-xs text-gray-400">Ignored if Admin</p>
          </div>
          <div className="space-y-2">
            {MODULES.map((m) => {
              const levels = m.yesNo
                ? ([["none", "No"], ["view", "Yes"]] as const)
                : ([["none", "None"], ["view", "View"], ["full", "Full"]] as const);
              const subPages = SUB_MODULES.filter((s) => s.parentKey === m.key);
              return (
                <div key={m.key} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">{m.label}</span>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                      {levels.map(([value, label]) => (
                        <label key={value} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name={`perm_${m.key}`}
                            value={value}
                            defaultChecked={perms[m.key] === value}
                            className="sr-only peer"
                          />
                          <span className="block px-3 py-1 text-xs font-medium rounded-md transition-colors text-gray-500 peer-checked:bg-zinc-900 peer-checked:text-white">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {subPages.length > 0 && (
                    <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100">
                      <p className="w-full text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Sub-pages</p>
                      {subPages.map((s) => {
                        const isChecked = !perms.sub || Object.keys(perms.sub).length === 0
                          ? true
                          : perms.sub[s.key] === true;
                        return (
                          <label key={s.key} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" name={`sub_${s.key}`} value="1" defaultChecked={isChecked} className="w-3.5 h-3.5 accent-black rounded" />
                            <span className="text-xs text-gray-600">{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <SubmitButton pendingText="Saving..." className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          Save Changes
        </SubmitButton>
      </form>

      {/* Change Password */}
      <form action={changePasswordBound} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Change Password</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">New Password</label>
          <input type="password" name="password" required minLength={6} autoComplete="new-password"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          <p className="text-xs text-gray-400 mt-1">Min. 6 characters</p>
        </div>
        <SubmitButton pendingText="Updating..." className="border border-gray-200 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
          Update Password
        </SubmitButton>
      </form>

      {/* Employee Call mobile app */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Employee Call App</h2>
          <p className="text-xs text-gray-500 mt-1">
            Login token for the Employee Call Android app. Enter this token in the app
            instead of a username/password &mdash; it&apos;s how call logs from this
            employee&apos;s phone get attributed to their account.
          </p>
        </div>

        {user.apiToken ? (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Current Token</label>
              <input
                type="text"
                readOnly
                value={user.apiToken}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-gray-50 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <form action={regenerateTokenBound}>
                <SubmitButton pendingText="Regenerating..." className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Regenerate
                </SubmitButton>
              </form>
              <form action={revokeTokenBound}>
                <SubmitButton pendingText="Revoking..." className="border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
                  Revoke
                </SubmitButton>
              </form>
            </div>
          </>
        ) : (
          <form action={regenerateTokenBound}>
            <SubmitButton pendingText="Generating..." className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
              Generate Token
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
