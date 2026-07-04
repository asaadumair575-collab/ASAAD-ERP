import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { parsePermissions, MODULES } from "@/lib/permissions";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage who can log in and what they can access.
          </p>
        </div>
        <Link
          href="/settings/users/new"
          className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New User
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
        {users.map((u) => {
          const perms = parsePermissions(u.permissions);
          const accessibleModules = u.isAdmin
            ? MODULES.map((m) => m.label)
            : MODULES.filter((m) => perms[m.key] !== "none").map((m) => m.label);

          return (
            <Link
              key={u.id}
              href={`/settings/users/${u.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                  {(u.displayName || u.username).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.displayName || u.username}
                    {u.id === me.id && (
                      <span className="ml-2 text-xs text-gray-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {u.isAdmin ? (
                  <span className="text-xs font-medium bg-black text-white px-2.5 py-1 rounded-full">
                    Admin
                  </span>
                ) : (
                  <p className="text-xs text-gray-400 text-right max-w-[200px] truncate">
                    {accessibleModules.length === 0
                      ? "No access"
                      : accessibleModules.join(", ")}
                  </p>
                )}
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-gray-300">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
