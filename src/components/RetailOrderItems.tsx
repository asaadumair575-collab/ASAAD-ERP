"use client";

import { useState } from "react";

type Item = { id: number; description: string; quantity: number; rate: number; costPrice: number };

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RetailOrderItems({
  items,
  totalAmount,
  updateCostAction,
}: {
  items: Item[];
  totalAmount: number;
  updateCostAction: (itemId: number, formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
          <th className="py-2 px-5">Item</th>
          <th className="py-2 px-5 text-right">Qty</th>
          <th className="py-2 px-5 text-right">Rate</th>
          <th className="py-2 px-5 text-right">Amount</th>
          <th className="py-2 px-5 text-right">Ball Cost</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="py-3 px-5 font-medium">{item.description}</td>
            <td className="py-3 px-5 text-right tabular-nums text-gray-600">{item.quantity}</td>
            <td className="py-3 px-5 text-right tabular-nums text-gray-500">Rs {fmt(item.rate)}</td>
            <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(item.quantity * item.rate)}</td>
            <td className="py-3 px-5 text-right">
              {editing === item.id ? (
                <form
                  action={(fd) => { updateCostAction(item.id, fd); setEditing(null); }}
                  className="flex items-center justify-end gap-1.5"
                >
                  <input
                    type="number"
                    name="costPrice"
                    min="0"
                    step="1"
                    defaultValue={item.costPrice || ""}
                    placeholder="0"
                    autoFocus
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-24 text-right focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <button type="submit" className="text-xs font-medium bg-black text-white px-2 py-1 rounded-lg">✓</button>
                  <button type="button" onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(item.id)}
                  className={`text-xs px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors ${
                    item.costPrice > 0 ? "text-gray-700 font-medium" : "text-gray-300 italic"
                  }`}
                >
                  {item.costPrice > 0 ? `Rs ${fmt(item.costPrice * item.quantity)}` : "set cost"}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
          <td className="py-3 px-5" colSpan={3}>Total</td>
          <td className="py-3 px-5 text-right tabular-nums">Rs {fmt(totalAmount)}</td>
          <td className="py-3 px-5 text-right tabular-nums text-gray-500">
            {items.some(i => i.costPrice > 0)
              ? `Rs ${fmt(items.reduce((s, i) => s + i.quantity * i.costPrice, 0))}`
              : "—"}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
