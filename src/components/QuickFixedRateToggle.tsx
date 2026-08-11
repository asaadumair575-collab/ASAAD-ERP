"use client";
import { useState, useTransition } from "react";
import { setClientFixedRate } from "@/lib/actions";

export default function QuickFixedRateToggle({
  clientId,
  defaultEnabled,
  defaultAmount,
}: {
  clientId: number;
  defaultEnabled: boolean;
  defaultAmount: number | null;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  function save(newEnabled: boolean, newAmount: string) {
    const parsed = parseFloat(newAmount) || null;
    start(async () => {
      await setClientFixedRate(clientId, newEnabled, parsed);
      setEditing(false);
    });
  }

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    if (!next) {
      save(false, amount);
    } else {
      setEditing(true);
    }
  }

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${enabled ? "border-violet-200 bg-violet-50" : "border-gray-200 bg-gray-50"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Fixed Rate Customer</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled && defaultAmount
              ? `H9 auto-fills at ₨${defaultAmount}/dz`
              : "Auto-fill H9 rate on every invoice"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
            enabled ? "bg-violet-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {enabled && (editing || !defaultAmount) ? (
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-violet-700 mb-1">
              Fixed Rate (per dozen) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₨</span>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-violet-300 rounded-xl pl-8 pr-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              />
            </div>
          </div>
          <button
            onClick={() => save(true, amount)}
            disabled={pending || !amount}
            className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-colors"
          >
            {pending ? "Saving..." : "Save"}
          </button>
          {defaultAmount && (
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2"
            >
              Cancel
            </button>
          )}
        </div>
      ) : enabled && defaultAmount ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-bold text-violet-700">₨{defaultAmount}<span className="text-xs font-normal text-violet-500">/dz</span></span>
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] text-violet-500 hover:text-violet-700 underline underline-offset-2"
          >
            Change
          </button>
        </div>
      ) : null}
    </div>
  );
}
