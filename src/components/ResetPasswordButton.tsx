"use client";

import { useState, useTransition } from "react";

export default function ResetPasswordButton({ action }: { action: () => Promise<string> }) {
  const [password, setPassword] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Generate a new password? The owner will be signed out everywhere.")) start(async () => setPassword(await action()));
        }}
        className="h-8 px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {password && (
        <span className="text-sm">
          New password: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{password}</code>
        </span>
      )}
    </div>
  );
}
