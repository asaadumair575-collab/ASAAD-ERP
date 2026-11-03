"use server";

import { redirect } from "next/navigation";
import { accessProblem, endSession, startUserSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { clearFailures, isLocked, recordFailure } from "@/lib/ratelimit";

export type LoginState = { error?: string } | undefined;

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const key = `user:${email}`;
  if (isLocked(key)) return { error: "Too many attempts. Try again in 10 minutes." };
  const user = await db.user.findUnique({ where: { email }, include: { tenant: true } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordFailure(key);
    return { error: "Incorrect email or password." };
  }
  clearFailures(key);
  const problem = accessProblem(user.tenant);
  if (problem === "expired") return { error: "Your access has ended. Please contact us to continue." };
  if (problem === "suspended") return { error: "This account is paused. Please contact us." };
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startUserSession(user);
  redirect("/app");
}

export async function logout() {
  await endSession("sd_user");
  redirect("/login");
}
