"use client";

import { useState, useTransition, useRef } from "react";

const FIXED_CATEGORIES = ["Shopify", "Agency Commission", "Other"] as const;
const VARIABLE_CATEGORIES = ["Ads", "Other"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function EcomExpenseForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [tab, setTab] = useState<"FIXED" | "VARIABLE">("VARIABLE");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const categories = tab === "FIXED" ? FIXED_CATEGORIES : VARIABLE_CATEGORIES;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          type="button"
          onClick={() => setTab("VARIABLE")}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${tab === "VARIABLE" ? "bg-purple-50 text-purple-700 border-b-2 border-purple-500" : "text-gray-400 hover:text-gray-600"}`}
        >
          Variable (Ads · daily)
        </button>
        <button
          type="button"
          onClick={() => setTab("FIXED")}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${tab === "FIXED" ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500" : "text-gray-400 hover:text-gray-600"}`}
        >
          Fixed (Shopify · one-time)
        </button>
      </div>

      <form
        key={tab}
        ref={formRef}
        action={(fd) =>
          startTransition(async () => {
            fd.set("type", tab);
            await action(fd);
            formRef.current?.reset();
          })
        }
        className="p-5 grid grid-cols-2 gap-4"
      >
        <input type="hidden" name="type" value={tab} />

        {tab === "VARIABLE" && (
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
        )}

        {tab === "FIXED" && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Month / Period</label>
            <input
              name="date"
              type="month"
              defaultValue={today().slice(0, 7)}
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
          <select
            name="category"
            required
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            {categories.map((c) => (
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
            placeholder={tab === "VARIABLE" ? "e.g. Facebook campaign" : "e.g. July subscription"}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="col-span-2">
          <button
            type="submit"
            disabled={pending}
            className={`w-full text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 ${tab === "VARIABLE" ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {pending ? "Saving..." : tab === "VARIABLE" ? "Add Daily Expense" : "Add Fixed Cost"}
          </button>
        </div>
      </form>
    </div>
  );
}
