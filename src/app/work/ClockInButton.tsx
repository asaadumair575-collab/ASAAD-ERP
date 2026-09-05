"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockIn } from "@/lib/actions";

export default function ClockInButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClockIn() {
    startTransition(async () => {
      await clockIn();
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClockIn}
      disabled={pending}
      className="w-full bg-[#BFD732] text-[#16202E] text-sm font-bold py-3.5 rounded-xl hover:bg-[#d3ec4a] disabled:opacity-50 transition-colors"
    >
      {pending ? "Starting..." : "▶ Start Working"}
    </button>
  );
}
