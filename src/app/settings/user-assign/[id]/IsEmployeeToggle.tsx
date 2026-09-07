"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setIsEmployee } from "@/lib/actions";

export default function IsEmployeeToggle({ userId, isEmployee }: { userId: number; isEmployee: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await setIsEmployee(userId, !isEmployee);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Employee</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {isEmployee
            ? "Shows up in My Work, task assignment, reorder calls, and every other employee picker."
            : "Off — hidden from My Work, task assignment, reorder calls, and every other employee picker."}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${isEmployee ? "bg-black" : "bg-gray-200"}`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${isEmployee ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
