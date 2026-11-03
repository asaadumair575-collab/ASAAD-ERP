import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import Logo from "@/components/Logo";
import { adminLogin } from "../actions";

export const metadata: Metadata = { title: "Admin" };

export default function AdminLogin() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-2"><Logo /><span className="text-[11px] font-semibold text-white bg-gray-950 rounded-full px-2 py-0.5">ADMIN</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">Admin sign in</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Manage customer accounts and demos.</p>
        <LoginForm action={adminLogin} />
      </div>
    </main>
  );
}
