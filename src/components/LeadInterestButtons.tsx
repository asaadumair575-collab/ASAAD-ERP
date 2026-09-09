"use client";

import { useState, useTransition } from "react";

// The system's second question, asked once a shop shows up on the Contacted
// list: did the call actually go anywhere? Interested moves it to Deal in
// Process for the senior's personal follow-up; Not Interested closes it out.
export default function LeadInterestButtons({
  leadId,
  interestAction,
}: {
  leadId: number;
  interestAction: (id: number, interested: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState<"yes" | "no" | null>(null);

  function mark(interested: boolean) {
    setChoosing(interested ? "yes" : "no");
    startTransition(async () => {
      await interestAction(leadId, interested);
    });
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <button
        type="button"
        onClick={() => mark(false)}
        disabled={isPending}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {isPending && choosing === "no" ? "…" : "Not Interested"}
      </button>
      <button
        type="button"
        onClick={() => mark(true)}
        disabled={isPending}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {isPending && choosing === "yes" ? "…" : "Interested"}
      </button>
    </div>
  );
}
