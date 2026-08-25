"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLeadActiveOnApp } from "@/lib/actions";

// Lets an admin choose exactly which lead(s) show up in the Employee Call
// app's lead list — nothing shows there unless it's explicitly turned on
// here first.
export default function ActiveOnAppToggle({ leadId, active }: { leadId: number; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      await toggleLeadActiveOnApp(leadId);
      router.replace(window.location.pathname + window.location.search);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={active ? "Employee Call app se hata dein" : "Employee Call app par dikhayein"}
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors disabled:opacity-40 ${
        active
          ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
          : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
      }`}
    >
      {pending ? "..." : active ? "📱 On App" : "📱 Add to App"}
    </button>
  );
}
