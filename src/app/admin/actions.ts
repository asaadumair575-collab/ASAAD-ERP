"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Plan } from "@/generated/prisma/client";
import { endSession, requireAdmin, startAdminSession } from "@/lib/auth";
import { hashPassword, randomPassword, safeEqual, verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { clearFailures, isLocked, recordFailure } from "@/lib/ratelimit";
import { loadSampleData } from "@/lib/sample";

export type LoginState = { error?: string } | undefined;

export async function adminLogin(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const key = `admin:${email}`;
  if (isLocked(key)) return { error: "Too many attempts. Try again in 10 minutes." };
  let admin = await db.admin.findUnique({ where: { email } });

  // First run: the very first admin comes from ADMIN_EMAIL / ADMIN_PASSWORD.
  if (!admin && (await db.admin.count()) === 0) {
    const envEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD ?? "";
    if (envEmail && envPassword.length >= 8 && email === envEmail && safeEqual(password, envPassword)) {
      admin = await db.admin.create({ data: { email, name: "Admin", passwordHash: hashPassword(password) } });
    }
  }
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    recordFailure(key);
    return { error: "Incorrect email or password." };
  }
  clearFailures(key);
  await startAdminSession(admin);
  redirect("/admin");
}

export async function adminLogout() {
  await endSession("sd_admin");
  redirect("/admin/login");
}

const expiryFrom = (days: number) => (days > 0 ? new Date(Date.now() + days * 86400000) : null);

export type CreateState = { error?: string; created?: { id: number; store: string; email: string; password: string; expiresAt: string | null } } | undefined;

export async function createAccount(_: CreateState, form: FormData): Promise<CreateState> {
  await requireAdmin();
  const store = String(form.get("store") ?? "").trim();
  const ownerName = String(form.get("ownerName") ?? "").trim() || store;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "").trim() || randomPassword();
  const plan = String(form.get("plan") ?? "TRIAL") as Plan;
  const days = Number(form.get("days") === "custom" ? form.get("customDays") : form.get("days")) || 0;
  const sample = form.get("sample") === "on";

  if (!store || !email) return { error: "Store name and email are required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (await db.user.findUnique({ where: { email } })) return { error: "A user with this email already exists." };

  const tenant = await db.tenant.create({
    data: {
      name: store,
      plan,
      isDemo: sample,
      expiresAt: expiryFrom(days),
      users: { create: { name: ownerName, email, passwordHash: hashPassword(password), role: "OWNER" } },
    },
  });
  if (sample) await loadSampleData(tenant.id);
  revalidatePath("/admin");
  return { created: { id: tenant.id, store, email, password, expiresAt: tenant.expiresAt?.toISOString() ?? null } };
}

export async function extendAccess(tenantId: number, form: FormData) {
  await requireAdmin();
  const days = Number(form.get("days")) || 0;
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  let expiresAt: Date | null;
  if (days === 0) expiresAt = null; // unlimited
  else {
    const base = tenant.expiresAt && tenant.expiresAt.getTime() > Date.now() ? tenant.expiresAt.getTime() : Date.now();
    expiresAt = new Date(base + days * 86400000);
  }
  await db.tenant.update({ where: { id: tenantId }, data: { expiresAt, status: "ACTIVE" } });
  revalidatePath("/admin");
  revalidatePath(`/admin/accounts/${tenantId}`);
}

export async function endAccessNow(tenantId: number) {
  await requireAdmin();
  await db.tenant.update({ where: { id: tenantId }, data: { expiresAt: new Date() } });
  revalidatePath(`/admin/accounts/${tenantId}`);
}

export async function setSuspended(tenantId: number, suspended: boolean) {
  await requireAdmin();
  await db.tenant.update({ where: { id: tenantId }, data: { status: suspended ? "SUSPENDED" : "ACTIVE" } });
  revalidatePath("/admin");
  revalidatePath(`/admin/accounts/${tenantId}`);
}

export async function updateAccount(tenantId: number, form: FormData) {
  await requireAdmin();
  await db.tenant.update({
    where: { id: tenantId },
    data: { name: String(form.get("name") ?? "").trim() || undefined, plan: String(form.get("plan")) as Plan, notes: String(form.get("notes") ?? "").trim() || null },
  });
  revalidatePath(`/admin/accounts/${tenantId}`);
}

export async function resetOwnerPassword(userId: number, tenantId: number): Promise<string> {
  await requireAdmin();
  const password = randomPassword();
  await db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(password), sessionVersion: { increment: 1 } } });
  revalidatePath(`/admin/accounts/${tenantId}`);
  return password;
}

export async function deleteAccount(tenantId: number) {
  await requireAdmin();
  await db.tenant.delete({ where: { id: tenantId } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function changeAdminPassword(form: FormData) {
  const admin = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!verifyPassword(current, admin.passwordHash)) throw new Error("Current password is wrong.");
  if (next.length < 8) throw new Error("New password must be at least 8 characters.");
  await db.admin.update({ where: { id: admin.id }, data: { passwordHash: hashPassword(next) } });
}
