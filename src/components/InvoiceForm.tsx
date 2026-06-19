"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

type Client = { id: number; name: string; businessName: string | null };
type Product = { id: number; name: string };
type Row = { id: number; quantity: number; rate: number };

export default function InvoiceForm({
  action,
  clients,
  products,
}: {
  action: (formData: FormData) => void;
  clients: Client[];
  products: Product[];
}) {
  const [rows, setRows] = useState<Row[]>([{ id: 0, quantity: 0, rate: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function handleProductChange(rowId: number, rowEl: HTMLSelectElement) {
    const row = rowEl.closest("[data-row]");
    const product = products.find((p) => p.id === parseInt(rowEl.value, 10));
    if (!row || !product) return;
    const descInput = row.querySelector<HTMLInputElement>(
      'input[name="itemDescription"]'
    );
    if (descInput) descInput.value = product.name;
  }

  const subtotal = rows.reduce((s, r) => s + r.quantity * r.rate, 0);
  const taxAmount = (subtotal - discount) * (taxPercent / 100);
  const grandTotal = subtotal - discount + taxAmount;

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
              Payment Terms
            </label>
            <input
              type="text"
              name="paymentTerms"
              placeholder="e.g. Advance"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
            <span className="min-w-[160px]">Item</span>
            <span className="flex-1 min-w-[150px]">Description</span>
            <span className="w-24">Qty</span>
            <span className="w-28">Rate</span>
            <span className="w-28">Amount</span>
          </div>
          {rows.map((row) => (
            <div key={row.id} data-row className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[160px]">
                <select
                  name="itemProductId"
                  defaultValue=""
                  onChange={(e) => handleProductChange(row.id, e.target)}
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
                  value={row.quantity || ""}
                  onChange={(e) =>
                    updateRow(row.id, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  name="itemRate"
                  placeholder="Rate"
                  value={row.rate || ""}
                  onChange={(e) =>
                    updateRow(row.id, { rate: parseFloat(e.target.value) || 0 })
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                />
              </div>
              <div className="w-28 text-sm font-medium px-1 py-2">
                {(row.quantity * row.rate).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((r) => r.filter((x) => x.id !== row.id))}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-2"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setRows((r) => [...r, { id: Date.now(), quantity: 0, rate: 0 }])
            }
            className="text-sm text-gray-600 hover:text-black underline"
          >
            + Add item
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-gray-200">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Discount
            </label>
            <input
              type="number"
              step="0.01"
              name="discount"
              placeholder="0"
              value={discount || ""}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Tax %
            </label>
            <input
              type="number"
              step="0.01"
              name="taxPercent"
              placeholder="0"
              value={taxPercent || ""}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div className="flex-1" />
          <div className="space-y-1 text-right">
            <div className="flex justify-between gap-6 text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-6 text-sm text-gray-500">
              <span>Discount</span>
              <span>{discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-6 text-sm text-gray-500">
              <span>Tax ({taxPercent}%)</span>
              <span>{taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-6 text-lg font-semibold">
              <span>Total</span>
              <span>{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. All payment should be advance"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Terms
            </label>
            <textarea
              name="terms"
              rows={2}
              placeholder="e.g. Delivery through Cargo service 3 to 5 days"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
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
