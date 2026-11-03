"use client";

import { useActionState, useState } from "react";
import { inputCls } from "./ui";

type Action = (state: { error?: string } | undefined, form: FormData) => Promise<{ error?: string } | undefined>;

export default function LoginForm({ action, initialError }: { action: Action; initialError?: string }) {
  const [state, formAction, pending] = useActionState(action, initialError ? { error: initialError } : undefined);
  // Controlled so a failed attempt doesn't wipe what was typed (React resets forms after an action).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1.5">Email</span>
        <input name="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1.5">Password</span>
        <input name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      </label>
      {state?.error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full h-11 rounded-xl bg-gray-950 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
