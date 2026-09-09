"use client";

import { useTransition } from "react";

// Just records that the call happened. Whether the shop is interested is a
// separate step, asked once the lead is on the Contacted list.
export default function ContactReasonModal({
  action,
  triggerLabel = "Mark Contacted",
  triggerClassName = "bg-black text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50",
}: {
  action: () => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function mark() {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <button type="button" onClick={mark} disabled={isPending} className={triggerClassName}>
      {isPending ? "Saving…" : triggerLabel}
    </button>
  );
}
