"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

type Product = { id: number; name: string };
type Customer = { id: number; name: string; phone: string | null; city: string | null };
type Row = { id: number; description: string; quantity: number; rate: number; costPrice: number };

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function RetailOrderForm({
  action,
  products,
  customers = [],
}: {
  action: (formData: FormData) => void;
  products: Product[];
  customers?: Customer[];
}) {
  const [rows, setRows] = useState<Row[]>([{ id: 0, description: "", quantity: 0, rate: 0, costPrice: 0 }]);
  const [deliveryCharge, setDeliveryCharge] = useState(300);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const selectedCustomer = customers.find((c) => String(c.id) === selectedCustomerId);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const total = round2(rows.reduce((s, r) => s + r.quantity * r.rate, 0));
  const balanceAfterAdvance = Math.max(0, total - deliveryCharge);

  return (
    <form action={action} className="space-y-5">
      {/* Customer info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Customer</h2>

        {customers.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Select existing retail customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              name="retailCustomerId"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="">— Quick / one-time entry —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.city ? ` (${c.city})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedCustomer ? (
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
            <p className="font-medium">{selectedCustomer.name}</p>
            {(selectedCustomer.phone || selectedCustomer.city) && (
              <p className="text-gray-500 text-xs mt-0.5">
                {[selectedCustomer.phone, selectedCustomer.city].filter(Boolean).join(" · ")}
              </p>
            )}
            <input type="hidden" name="customerName" value={selectedCustomer.name} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs text-gray-500 mb-1.5">Name <span className="text-black">*</span></label>
              <input type="text" name="customerName" required placeholder="e.g. Ahmed"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Phone</label>
              <input type="tel" name="phone" placeholder="03xx-xxxxxxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">City</label>
              <input type="text" name="city" placeholder="e.g. Lahore"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Items</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_70px_90px_90px_70px] gap-2 text-xs text-gray-400 px-1">
            <span>Product / Description</span>
            <span>Qty</span>
            <span>Rate (Rs)</span>
            <span>Cost (Rs)</span>
            <span className="text-right">Amount</span>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_70px_90px_90px_70px] gap-2 items-center">
              <div className="flex flex-col gap-1">
                <select
                  onChange={(e) => {
                    const p = products.find((p) => String(p.id) === e.target.value);
                    if (p) updateRow(row.id, { description: p.name });
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-500 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Pick product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="itemDescription"
                  placeholder="or type description"
                  value={row.description}
                  onChange={(e) => updateRow(row.id, { description: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                />
              </div>
              <input
                type="number"
                name="itemQuantity"
                min="0"
                step="0.5"
                value={row.quantity || ""}
                placeholder="0"
                onChange={(e) => updateRow(row.id, { quantity: parseFloat(e.target.value) || 0 })}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-black bg-white"
              />
              <input
                type="number"
                name="itemRate"
                min="0"
                step="1"
                value={row.rate || ""}
                placeholder="0"
                onChange={(e) => updateRow(row.id, { rate: parseFloat(e.target.value) || 0 })}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
              />
              <input
                type="number"
                name="itemCostPrice"
                min="0"
                step="1"
                value={row.costPrice || ""}
                placeholder="0"
                onChange={(e) => updateRow(row.id, { costPrice: parseFloat(e.target.value) || 0 })}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
              />
              <div className="text-right text-sm font-medium tabular-nums">
                {round2(row.quantity * row.rate).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setRows((r) => [...r, { id: Date.now(), description: "", quantity: 0, rate: 0, costPrice: 0 }])}
            className="text-sm text-gray-500 hover:text-black underline"
          >
            + Add item
          </button>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows((r) => r.slice(0, -1))}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Remove last
            </button>
          )}
          <div className="text-base font-semibold">
            Total: Rs {total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Delivery advance */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-orange-800">Delivery Advance (COD)</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-orange-700 mb-1.5">Advance Amount (Rs)</label>
            <input
              type="number"
              name="deliveryCharge"
              min="0"
              step="1"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
              className="border border-orange-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>
          <div className="text-sm text-orange-700 pb-2">
            <span className="font-medium">Balance after advance:</span>{" "}
            <span className="font-semibold">Rs {balanceAfterAdvance.toLocaleString()}</span>
            <p className="text-xs text-orange-500 mt-0.5">This will be collected later — use Record Payment.</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1.5">Notes (optional)</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="e.g. TCS cargo, fragile, etc."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <SubmitButton
        pendingText="Creating..."
        className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
      >
        Create Retail Order
      </SubmitButton>
    </form>
  );
}
