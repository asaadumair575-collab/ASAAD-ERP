import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function UserAssignPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, displayName: true, mustSetPassword: true, createdAt: true },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Settings</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">User Assign</h1>
        <p className="text-sm text-gray-400 mt-0.5">New user access system — in progress</p>
      </div>

      <div className="flex justify-end">
        <Link
          href="/settings/user-assign/new"
          className="inline-flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          Create New User
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <p className="text-sm font-medium text-gray-500">No users yet</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/settings/user-assign/${u.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{u.displayName ?? u.username}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {u.mustSetPassword ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                      Pending — hasn&apos;t set a password
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-green-200 bg-green-50 text-green-700">
                      Active
                    </span>
                  )}
                  <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5 text-gray-300"><path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
