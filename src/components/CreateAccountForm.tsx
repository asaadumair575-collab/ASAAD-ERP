"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { CreateState } from "@/app/admin/actions";
import { inputCls } from "./ui";

type Action = (state: CreateState, form: FormData) => Promise<CreateState>;

export default function CreateAccountForm({ action, loginUrl, appName }: { action: Action; loginUrl: string; appName: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [days, setDays] = useState("3");
  const [copied, setCopied] = useState(false);
  const c = state?.created;
  const formRef = useRef<HTMLFormElement>(null);
  // Clear the form only after an account was actually created.
  useEffect(() => {
    if (c) formRef.current?.reset();
  }, [c]);

  const message = c
    ? `Your ${appName === "Your Company" ? "" : `${appName} `}account is ready.\n\nLogin: ${loginUrl}\nEmail: ${c.email}\nPassword: ${c.password}${
        c.expiresAt ? `\nAccess until: ${new Date(c.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""
      }`
    : "";

  return (
    <div className="space-y-4">
      {c && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Account created for {c.store}. Share these details:</p>
          <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white border border-green-200 rounded p-3">{message}</pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(message);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-2 h-8 px-3 rounded-xl bg-gray-950 text-white text-xs font-medium"
          >
            {copied ? "Copied" : "Copy message"}
          </button>
        </div>
      )}
      <form
        ref={formRef}
        className="grid sm:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Store name</span>
          <input name="store" required className={inputCls} placeholder="e.g. Ali Fashion" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Owner name</span>
          <input name="ownerName" className={inputCls} placeholder="Optional" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Login email</span>
          <input name="email" type="email" required className={inputCls} placeholder="owner@store.com" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Password</span>
          <input name="password" className={inputCls} placeholder="Leave empty to generate" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Access for</span>
          <div className="flex gap-2">
            <select name="days" value={days} onChange={(e) => setDays(e.target.value)} className={inputCls}>
              <option value="3">3 days</option>
              <option value="4">4 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="custom">Custom…</option>
              <option value="0">No end date</option>
            </select>
            {days === "custom" && <input name="customDays" type="number" min={1} required className={`${inputCls} w-24`} placeholder="Days" />}
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Plan</span>
          <select name="plan" defaultValue="TRIAL" className={inputCls}>
            <option value="TRIAL">Trial / Demo</option>
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="PRO">Pro</option>
          </select>
        </label>
        <label className="sm:col-span-2 flex items-start gap-2 text-sm text-gray-700">
          <input name="sample" type="checkbox" defaultChecked className="mt-0.5 accent-gray-950" />
          <span>
            Fill with sample data (demo store)
            <span className="block text-xs text-gray-500">Adds products and 6 weeks of orders with a simulated courier, so the account looks live right away. Leave off for a real customer who will connect their own Shopify.</span>
          </span>
        </label>
        {state?.error && <p className="sm:col-span-2 text-sm text-red-600">{state.error}</p>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="h-10 px-4 rounded-xl bg-gray-950 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60">
            {pending ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
