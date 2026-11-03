"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { CompanyLogo } from "../_components/DemoShell";
import { inputCls } from "../_components/ui";

export default function DemoLogin() {
  const router = useRouter();
  const login = useDemo((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between bg-[#F15A24] text-white p-12">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-white text-[#F15A24] font-bold flex items-center justify-center">YC</span>
          <span className="text-lg font-bold">Your Company</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Run your whole online store from one screen.</h2>
          <p className="mt-4 text-white/85 text-lg">Shopify orders, courier booking, tracking, returns and COD — all synced automatically.</p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            {[["Shopify", "Orders sync"], ["Couriers", "1-click booking"], ["COD", "Payment tracking"]].map(([a, b]) => (
              <div key={a} className="bg-white/15 rounded-2xl p-4">
                <p className="font-semibold">{a}</p>
                <p className="text-xs text-white/80 mt-1">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-white/70">© {new Date().getFullYear()} Your Company</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form
          className="w-full max-w-sm space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (login(email, password)) router.replace("/demo");
            else setError("Incorrect email or password.");
          }}
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <CompanyLogo />
            <span className="text-lg font-bold">Your Company</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your store dashboard.</p>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="you@store.com" autoComplete="username" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} placeholder="••••••••" autoComplete="current-password" />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full h-11 rounded-xl bg-[#F15A24] hover:bg-[#D9480F] text-white font-semibold shadow-sm">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
