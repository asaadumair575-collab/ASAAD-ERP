import { BarChart3, ShoppingBag, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import Logo from "@/components/Logo";
import { redirect } from "next/navigation";
import { OPEN_PREVIEW } from "@/lib/preview";
import { login } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

const REASONS: Record<string, string> = {
  expired: "Your access has ended. Please contact us to continue.",
  suspended: "This account is paused. Please contact us.",
};

const POINTS = [
  { icon: ShoppingBag, title: "Shopify orders, automatically", text: "Every new order lands here the moment it's placed." },
  { icon: Truck, title: "PostEx, Leopards & TCS", text: "Book parcels in bulk and track every one of them." },
  { icon: Wallet, title: "COD & real profit", text: "Know what the courier owes you and what you actually earned." },
  { icon: BarChart3, title: "Reports that matter", text: "Return rate by city, best products, courier performance." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  if (OPEN_PREVIEW && !reason) redirect("/app");
  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between bg-gray-950 text-white p-12">
        <Logo light />
        <div>
          <h2 className="text-3xl font-bold tracking-tight max-w-md leading-tight">Run your whole online store from one screen.</h2>
          <ul className="mt-10 space-y-6 max-w-md">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" strokeWidth={1.75} /></span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-gray-400 mt-0.5">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-gray-500">Secure sign-in · your data is encrypted</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1 mb-8">Sign in with the email and password you were given.</p>
          <LoginForm action={login} initialError={reason ? REASONS[reason] : undefined} />
        </div>
      </section>
    </main>
  );
}
