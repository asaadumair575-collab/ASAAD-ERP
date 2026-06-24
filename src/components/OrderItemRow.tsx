"use client";

import { useState } from "react";

type Item = {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  cost: number | null;
};

function formatCurrency(n: number) {
  return `PKR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderItemRow({
  item,
  showRemove,
  updateAction,
  deleteAction,
}: {
  item: Item;
  showRemove: boolean;
  updateAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr>
        <td className="py-2 px-3 print:hidden" colSpan={5}>
          <form
            action={(formData) => {
              updateAction(formData);
              setEditing(false);
            }}
            className="flex flex-wrap gap-2 items-end"
          >
            <input
              type="text"
              name="description"
              defaultValue={item.description}
              placeholder="Description"
              className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            <input
              type="number"
              step="0.01"
              name="quantity"
              defaultValue={item.quantity}
              placeholder="Qty"
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            <input
              type="number"
              step="0.01"
              name="rate"
              defaultValue={item.rate}
              placeholder="Rate"
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            <input
              type="number"
              step="0.01"
              name="cost"
              defaultValue={item.cost ?? ""}
              placeholder="Cost"
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            <button
              type="submit"
              className="text-xs text-white bg-black rounded-lg px-3 py-2 hover:bg-gray-800 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-black transition-colors px-2 py-2"
            >
              Cancel
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="py-2 px-3 font-medium print:py-4 print:px-5">{item.description}</td>
      <td className="py-2 px-3 text-right print:py-4 print:px-5">{item.quantity}</td>
      <td className="py-2 px-3 text-right print:py-4 print:px-5">{formatCurrency(item.rate)}</td>
      <td className="py-2 px-3 text-right print:py-4 print:px-5">
        {formatCurrency(item.quantity * item.rate)}
      </td>
      <td className="py-2 px-3 text-right print:hidden whitespace-nowrap">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-gray-400 hover:text-black transition-colors mr-3"
        >
          Edit
        </button>
        {showRemove && (
          <form action={deleteAction} className="inline">
            <button
              type="submit"
              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
            >
              Remove
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
