"use client";

import { Ban, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { blockPhone, unblockPhone } from "@/app/app/actions";

export default function BlockButton({ phone, blocked }: { phone: string; blocked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (blocked) {
          start(async () => { await unblockPhone(phone); router.refresh(); });
          return;
        }
        const reason = prompt(`Block ${phone}? Orders from this number won't be bookable.\n\nReason (optional):`, "Fake order / refused parcel");
        if (reason === null) return;
        start(async () => { await blockPhone(phone, reason); router.refresh(); });
      }}
      className={`inline-flex items-center gap-1 text-xs font-medium disabled:opacity-50 ${blocked ? "text-emerald-700 hover:underline" : "text-red-600 hover:underline"}`}
    >
      {blocked ? <><ShieldCheck className="w-3.5 h-3.5" />Unblock</> : <><Ban className="w-3.5 h-3.5" />Block number</>}
    </button>
  );
}
