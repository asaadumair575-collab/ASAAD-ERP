"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreAbortedLead } from "@/lib/actions";

export default function RestoreLeadButton({ leadId, count }: { leadId: number; count: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function restore() {
    start(async () => {
      await restoreAbortedLead(leadId);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-red-500">
        ⚠️ {count === 1 ? "1 employee" : `${count} employees`} ne number dekh ke cancel kiya
      </span>
      <button
        onClick={restore}
        disabled={pending}
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 disabled:opacity-40 transition-colors whitespace-nowrap"
      >
        {pending ? "..." : "↩ Restore"}
      </button>
    </span>
  );
}
