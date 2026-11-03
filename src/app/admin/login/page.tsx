import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import Logo from "@/components/Logo";
import { db } from "@/lib/db";
import { adminLogin, adminSetup } from "../actions";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  // No admin yet and none configured in the environment → first-run setup.
  const setup = !process.env.ADMIN_EMAIL && (await db.admin.count()) === 0;
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-2"><Logo /><span className="text-[11px] font-semibold text-white bg-gray-950 rounded-full px-2 py-0.5">ADMIN</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">{setup ? "Create your admin account" : "Admin sign in"}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          {setup ? "First time here — choose the email and password you'll use to manage customer accounts. Only one admin can be created this way." : "Manage customer accounts and demos."}
        </p>
        <LoginForm action={setup ? adminSetup : adminLogin} submitLabel={setup ? "Create admin account" : undefined} />
      </div>
    </main>
  );
}
