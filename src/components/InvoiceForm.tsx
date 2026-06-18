"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

type Client = { id: number; name: string; businessName: string | null };
type Product = { id: number; name: string; rate: number };

export default function InvoiceForm({
  action,
  clients,
  products,
}: {
  action: (formData: FormData) => void;
  clients: Client[];
  products: Product[];
}) {
  const [rows, setRows] = useState([0]);

  function handleProductChange(rowEl: HTMLSelectElement) {
    const row = rowEl.closest("[data-row]");
    const product = products.find((p) => p.id === parseInt(rowEl.value, 10));
    if (!row || !product) return;
    const descInput = row.querySelector<HTMLInputElement>(
      'input[name="itemDescription"]'
    );
    const rateInput = row.querySelector<HTMLInputElement>(
      'input[name="itemRate"]'
    );
    if (descInput) descInput.value = product.name;
    if (rateInput) rateInput.value = String(product.rate);
  }

  return (
    <form action={action} className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1.5">
              Customer<span className="text-black"> *</span>
            </label>
            <select
              name="clientId"
              required
              defaultValue=""
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="" disabled>
                Select customer
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.businessName ? ` (${c.businessName})` : ""}
                </option>
              ))}
            </select>
          </div>
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
          <label className="block text-xs text-gray-500">Products</label>
          {rows.map((rowId) => (
            <div key={rowId} data-row className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[160px]">
                <select
                  name="itemProductId"
                  defaultValue=""
                  onChange={(e) => handleProductChange(e.target)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="">Custom item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
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
      </div>

      <SubmitButton
        pendingText="Creating Invoice..."
        className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Create Invoice
      </SubmitButton>
    </form>
  );
}
