"use client";

import { useTransition, useState, useEffect } from "react";

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default function TrackingNumberForm({
  defaultValue,
  trackingSetAt,
  action,
}: {
  defaultValue: string;
  trackingSetAt: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!trackingSetAt || !defaultValue) {
      setLocked(false);
      return;
    }
    const elapsed = Date.now() - new Date(trackingSetAt).getTime();
    if (elapsed >= EDIT_WINDOW_MS) {
      setLocked(true);
      return;
    }
    const remaining = EDIT_WINDOW_MS - elapsed;
    setLocked(false);
    const timer = setTimeout(() => setLocked(true), remaining);
    return () => clearTimeout(timer);
  }, [trackingSetAt, defaultValue]);

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

  function handleCopy() {
    if (!defaultValue) return;
    navigator.clipboard.writeText(defaultValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (locked) {
    return (
      <div className="flex gap-2 items-center">
        <span className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono bg-gray-50 text-gray-700 select-all">
          {defaultValue}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="border border-gray-200 text-gray-600 text-xs font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          name="trackingNumber"
          defaultValue={defaultValue}
          placeholder="e.g. 28676630000031"
          minLength={14}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
        />
        {defaultValue && (
          <button
            type="button"
            onClick={handleCopy}
            className="border border-gray-200 text-gray-600 text-xs font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
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
