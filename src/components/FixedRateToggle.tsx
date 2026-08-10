"use client";
import { useState } from "react";

export default function FixedRateToggle({
  defaultEnabled = false,
  defaultAmount,
}: {
  defaultEnabled?: boolean;
  defaultAmount?: number;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${enabled ? "border-violet-200 bg-violet-50" : "border-gray-200 bg-gray-50"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Fixed Rate Customer</p>
          <p className="text-xs text-gray-500 mt-0.5">
            A fixed sale rate will auto-fill for VMS 72 on every invoice
          </p>
        </div>
        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
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

      {/* Hidden checkbox for form submission */}
      <input type="hidden" name="fixedRate" value={enabled ? "on" : "off"} />

      {enabled && (
        <div className="mt-4">
          <label className="block text-xs font-semibold text-violet-700 mb-1.5">
            Fixed Rate (per dozen) <span className="text-red-500">*</span>
          </label>
          <div className="relative max-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₨</span>
            <input
              type="number"
              name="fixedRateAmount"
              step="0.01"
              min="0"
              required={enabled}
              defaultValue={defaultAmount ?? ""}
              placeholder="0.00"
              className="w-full border border-violet-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
          </div>
          <p className="text-[11px] text-violet-600 mt-1.5">
            This rate will auto-apply when VMS 72 is added to any invoice for this customer
          </p>
        </div>
      )}
    </div>
  );
}
