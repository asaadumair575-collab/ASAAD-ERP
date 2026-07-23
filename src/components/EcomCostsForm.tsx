"use client";

import { useTransition } from "react";

export default function EcomCostsForm({
  action,
  shippingCost,
  returnCost,
}: {
  action: (formData: FormData) => Promise<void>;
  shippingCost: number;
  returnCost: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Costs</p>
        <p className="text-xs text-gray-400 mt-0.5">Packaging: Rs 15/order (fixed) · Ads: Expenses page se</p>
      </div>
      <form action={(fd) => startTransition(() => action(fd))} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Shipping Cost</label>
            <input name="shippingCost" type="number" step="1" min="0" defaultValue={shippingCost || ""} placeholder="0" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Return Cost</label>
            <input name="returnCost" type="number" step="1" min="0" defaultValue={returnCost || ""} placeholder="0" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
        </div>
        <button type="submit" disabled={pending} className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
          {pending ? "Saving..." : "Save Costs"}
        </button>
      </form>
    </div>
  );
}
