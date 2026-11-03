import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import Logo from "@/components/Logo";
import { login } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

const REASONS: Record<string, string> = {
  expired: "Your access has ended. Please contact us to continue.",
  suspended: "This account is paused. Please contact us.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8"><Logo /></div>
        <h1 className="text-xl font-semibold text-gray-900">Sign in to your store</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Orders, couriers and stock — in one place.</p>
        <LoginForm action={login} initialError={reason ? REASONS[reason] : undefined} />
      </div>
    </main>
  );
}
