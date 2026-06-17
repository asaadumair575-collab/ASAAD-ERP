"use client";

import { useState } from "react";

export default function OrderItemsForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [rows, setRows] = useState([0]);

  return (
    <form
      action={action}
      className="space-y-4 bg-gray-50 border border-gray-200 rounded-2xl p-5"
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Purchase Amount (total cost)
          </label>
          <input
            type="number"
            step="0.01"
            name="purchaseAmount"
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-gray-500">Items</label>
        {rows.map((rowId) => (
          <div key={rowId} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                name="itemDescription"
                placeholder="Item description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                name="itemQuantity"
                placeholder="Qty"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                name="itemRate"
                placeholder="Rate"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((id) => id !== rowId))}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-2"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((r) => [...r, Date.now()])}
          className="text-sm text-gray-600 hover:text-black underline"
        >
          + Add item
        </button>
      </div>

      <button
        type="submit"
        className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Add Order
      </button>
    </form>
  );
}
