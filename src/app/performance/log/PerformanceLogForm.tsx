"use client";

import { useRef, useState, useTransition } from "react";
import { logEmpPerformance } from "@/lib/actions";

type User = { id: number; displayName: string | null; username: string };

export default function PerformanceLogForm({
  isAdmin,
  users,
  todayStr,
}: {
  isAdmin: boolean;
  users: User[];
  todayStr: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      await logEmpPerformance(fd);
      formRef.current?.reset();
      // reset date back to today after reset
      const dateInput = formRef.current?.querySelector<HTMLInputElement>('input[name="date"]');
      if (dateInput) dateInput.value = todayStr;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="p-5 grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
        <input
          name="date"
          type="date"
          defaultValue={todayStr}
          required
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      {isAdmin && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Employee</label>
          <select
            name="userId"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Self</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.displayName ?? u.username}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Calls</label>
        <input
          name="calls"
          type="number"
          min="0"
          defaultValue="0"
          required
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">New Orders</label>
        <input
          name="newOrders"
          type="number"
          min="0"
          defaultValue="0"
          required
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div className="col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1 block">Notes <span className="text-red-500">*</span></label>
        <input
          name="notes"
          type="text"
          required
          placeholder="Aaj kya hua batao..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div className="col-span-2">
        {saved ? (
          <div className="w-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium py-2.5 rounded-xl text-center">
            ✓ Entry saved!
          </div>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {pending ? "Saving..." : "Save Entry"}
          </button>
        )}
      </div>
    </form>
  );
}
