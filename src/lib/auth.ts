import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { ADMIN_COOKIE, SESSION_DAYS, USER_COOKIE, createToken, readToken } from "./session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 86400,
};

export async function startUserSession(user: { id: number; sessionVersion: number }) {
  (await cookies()).set(USER_COOKIE, createToken({ id: user.id, v: user.sessionVersion }), cookieOptions);
}

export async function startAdminSession(admin: { id: number }) {
  (await cookies()).set(ADMIN_COOKIE, createToken({ id: admin.id, v: 0 }), cookieOptions);
}

export async function endSession(cookie: typeof USER_COOKIE | typeof ADMIN_COOKIE) {
  (await cookies()).delete(cookie);
}

export type AccessProblem = "expired" | "suspended" | null;

export function accessProblem(tenant: { status: string; expiresAt: Date | null }): AccessProblem {
  if (tenant.status === "SUSPENDED") return "suspended";
  if (tenant.expiresAt && tenant.expiresAt.getTime() < Date.now()) return "expired";
  return null;
}

// The signed-in store user, with their tenant — null if not signed in.
export const currentUser = cache(async () => {
  const p = readToken((await cookies()).get(USER_COOKIE)?.value);
  if (!p) return null;
  const user = await db.user.findUnique({ where: { id: p.id }, include: { tenant: true } });
  if (!user || user.sessionVersion !== p.v) return null;
  return user;
});

// For pages and actions inside /app: signed in, account active and not expired.
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const problem = accessProblem(user.tenant);
  if (problem) redirect(`/login?reason=${problem}`);
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "OWNER") throw new Error("Only the account owner can do this.");
  return user;
}

export const currentAdmin = cache(async () => {
  const p = readToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!p) return null;
  return db.admin.findUnique({ where: { id: p.id } });
});

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
