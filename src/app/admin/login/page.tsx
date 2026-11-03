import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import Logo from "@/components/Logo";
import { adminLogin } from "../actions";

export const metadata: Metadata = { title: "Admin" };

export default function AdminLogin() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2"><Logo /><span className="text-xs font-medium text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">Admin</span></div>
        <h1 className="text-xl font-semibold text-gray-900">Admin sign in</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Manage customer accounts and demos.</p>
        <LoginForm action={adminLogin} />
      </div>
    </main>
  );
}
