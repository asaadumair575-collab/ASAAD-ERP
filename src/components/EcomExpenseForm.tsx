"use client";

import { useTransition, useRef } from "react";

const CATEGORIES = ["Ads", "Agency Commission", "Shopify", "Other"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function EcomExpenseForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Log Expense</p>
      </div>
      <form
        ref={formRef}
        action={(fd) =>
          startTransition(async () => {
            await action(fd);
            formRef.current?.reset();
          })
        }
        className="p-5 grid grid-cols-2 gap-4"
      >
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
          <input
            name="date"
            type="date"
            defaultValue={today()}
            required
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
          <select
            name="category"
            required
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (Rs)</label>
          <input
            name="amount"
            type="number"
            step="1"
            min="0"
            required
            placeholder="0"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optional)</label>
          <input
            name="note"
            type="text"
            placeholder="e.g. Facebook campaign"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {pending ? "Saving..." : "Add Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
