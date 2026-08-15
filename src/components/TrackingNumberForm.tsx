"use client";

import { useTransition, useState } from "react";

export default function TrackingNumberForm({
  defaultValue,
  action,
}: {
  defaultValue: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

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
