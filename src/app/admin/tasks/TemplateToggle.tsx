"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleTaskTemplate } from "@/lib/actions";

export default function TemplateToggle({ id, active }: { id: number; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await toggleTaskTemplate(id, !active);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        active ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {active ? "Active" : "Paused"}
    </button>
  );
}
