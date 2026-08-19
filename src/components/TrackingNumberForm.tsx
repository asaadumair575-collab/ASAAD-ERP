"use client";

import { useTransition, useState } from "react";

export default function TrackingNumberForm({
  defaultValue,
  isAdmin,
  action,
}: {
  defaultValue: string;
  isAdmin: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!defaultValue) return;
    navigator.clipboard.writeText(defaultValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await action(fd);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "digest" in err) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // Non-admin: read-only display with inline copy icon
  if (!isAdmin && defaultValue) {
    return (
      <div className="relative flex items-center">
        <span className="flex-1 border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm font-mono bg-gray-50 text-gray-700 select-all block">
          {defaultValue}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy tracking number"
          className="absolute right-2.5 text-gray-400 hover:text-gray-700 transition-colors"
        >
          {copied ? (
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-green-500"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 11V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          )}
        </button>
      </div>
    );
  }

  // Non-admin, no tracking yet: show empty read-only
  if (!isAdmin) {
    return (
      <div className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400 bg-gray-50">
        Not set
      </div>
    );
  }

  // Admin: editable form with inline copy icon
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            name="trackingNumber"
            defaultValue={defaultValue}
            placeholder="e.g. 28676630000031"
            minLength={14}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
          />
          {defaultValue && (
            <button
              type="button"
              onClick={handleCopy}
              title="Copy tracking number"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              {copied ? (
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-green-500"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 11V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              )}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
