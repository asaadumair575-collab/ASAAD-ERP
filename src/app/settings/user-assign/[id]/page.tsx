import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { parsePermissions } from "@/lib/permissions";
import { ACCESS_MODULES, computeInitial } from "@/lib/moduleAccessConfig";
import { updateModuleAccess } from "@/lib/actions";
import ModuleAccessCard from "@/components/ModuleAccessCard";
import IsEmployeeToggle from "./IsEmployeeToggle";

export default async function UserAssignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/settings");

  const { id } = await params;
  const { saved } = await searchParams;
  const userId = parseInt(id, 10);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const perms = parsePermissions(user.permissions);
  const savedModule = ACCESS_MODULES.find((m) => m.key === saved);

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/settings/user-assign" className="text-gray-400 hover:text-black transition-colors">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.displayName ?? user.username}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            @{user.username}
            {user.mustSetPassword ? (
              <span className="ml-2 text-amber-600 font-medium">· hasn&apos;t set a password yet</span>
            ) : (
              <span className="ml-2 text-green-600 font-medium">· active</span>
            )}
          </p>
        </div>
      </div>

      {savedModule && (
        <div className="border border-green-200 bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700">
          ✓ {savedModule.title} access saved.
        </div>
      )}

      <IsEmployeeToggle userId={user.id} isEmployee={user.isEmployee} />

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          Modules ({ACCESS_MODULES.length})
        </p>
        <div className="space-y-4">
          {ACCESS_MODULES.map((config) => (
            <ModuleAccessCard
              key={config.key}
              title={config.title}
              description={config.description}
              pages={config.pages}
              initial={computeInitial(config, perms)}
              action={updateModuleAccess.bind(null, userId, config.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
