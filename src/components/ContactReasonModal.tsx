"use client";

import { useState, useTransition } from "react";

const REASONS = ["Interested", "Not Interested"];

// Simple, single-tap: call happened, pick the outcome, done.
export default function ContactReasonModal({
  action,
}: {
  action: (reason?: string) => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState<string | null>(null);

  function mark(reason: string) {
    setChoosing(reason);
    startTransition(async () => {
      await action(reason);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {REASONS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => mark(r)}
          disabled={isPending}
          className={`text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 ${
            r === "Interested" ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {isPending && choosing === r ? "Saving…" : r}
        </button>
      ))}
    </div>
  );
}
