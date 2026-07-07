import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { parsePermissions, canView, canManage, type ModuleKey } from "@/lib/permissions";

export async function requireView(module: ModuleKey) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const perms = parsePermissions(user.permissions);
  if (!canView(perms, module, user.isAdmin)) redirect("/?error=access");
  return { user, perms };
}

export async function requireManage(module: ModuleKey) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const perms = parsePermissions(user.permissions);
  if (!canManage(perms, module, user.isAdmin)) redirect("/?error=access");
  return { user, perms };
}
