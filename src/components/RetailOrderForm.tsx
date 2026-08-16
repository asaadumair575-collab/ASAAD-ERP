"use client";

import { useState, useMemo, useActionState } from "react";
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
  preselectedCustomer,
}: {
  action: (prev: string | null, formData: FormData) => Promise<string | null>;
  products: Product[];
  customers?: Customer[];
  preselectedCustomer?: Customer;
}) {
  const [rows, setRows] = useState<Row[]>([{ id: 0, description: "", quantity: 0, rate: 0, costPrice: 1550 }]);
  const [deliveryCharge, setDeliveryCharge] = useState<number | "">("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer ?? null);
  const [search, setSearch] = useState(preselectedCustomer?.name ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [error, formAction] = useActionState(action, null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.city ?? "").toLowerCase().includes(q)
    ).slice(0, 10);
  }, [search, customers]);

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setSearch(c.name);
    setShowDropdown(false);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setSearch("");
  }

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const total = round2(rows.reduce((s, r) => s + r.quantity * r.rate, 0));
  const balanceAfterAdvance = Math.max(0, total - (deliveryCharge || 0));

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {/* Customer info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Customer</h2>
          {!selectedCustomer && (
            <button type="button" onClick={() => setManualMode(!manualMode)}
              className="text-xs text-gray-400 hover:text-black underline underline-offset-2">
              {manualMode ? "Search existing" : "Add new"}
            </button>
          )}
        </div>

        {/* Search box — hidden when manualMode */}
        {!manualMode && (
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1.5">Search existing customer</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type name, phone or city…"
                value={search}
                autoComplete="off"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) setSelectedCustomer(null);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white pr-8"
              />
              {selectedCustomer && (
                <button type="button" onClick={clearCustomer}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 text-lg leading-none">×</button>
              )}
            </div>
            {showDropdown && filtered.length > 0 && !selectedCustomer && (
              <div className="absolute z-10 w-full mt-1 border border-gray-200 rounded-xl bg-white shadow-lg max-h-52 overflow-y-auto">
                {filtered.map((c) => (
                  <button key={c.id} type="button" onMouseDown={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex justify-between items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{[c.phone, c.city].filter(Boolean).join(" · ")}</span>
                  </button>
                ))}
              </div>
            )}
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
            <input type="hidden" name="retailCustomerId" value={selectedCustomer.id} />
            <input type="hidden" name="customerName" value={selectedCustomer.name} />
          </div>
        ) : manualMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs text-gray-500 mb-1.5">Name <span className="text-black">*</span></label>
              <input type="text" name="customerName" required placeholder="e.g. Ahmed"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Phone <span className="text-black">*</span></label>
              <input type="tel" name="phone" required placeholder="03xx-xxxxxxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">City <span className="text-black">*</span></label>
              <input type="text" name="city" required placeholder="e.g. Lahore"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-gray-500 mb-1.5">Address</label>
              <input type="text" name="address" placeholder="Street, area..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Items</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_80px_96px_80px] gap-2 text-xs text-gray-400 px-1">
            <span>Product / Description</span>
            <span>Qty (doz)</span>
            <span>Rate (Rs)</span>
            <span className="text-right">Amount</span>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_80px_96px_80px] gap-2 items-center">
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
              <select
                name="itemQuantity"
                value={row.quantity || ""}
                onChange={(e) => updateRow(row.id, { quantity: parseFloat(e.target.value) || 0 })}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-black bg-white"
              >
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
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
              <div className="text-right text-sm font-medium tabular-nums">
                {round2(row.quantity * row.rate).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <div className="text-base font-semibold">
            Total: Rs {total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Delivery advance — mandatory */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-orange-800">Advance Payment (COD) <span className="text-red-600">*</span></h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-orange-700 mb-1.5">Advance Amount (Rs) <span className="text-red-600">*</span></label>
            <input
              type="number"
              name="deliveryCharge"
              min="1"
              step="1"
              required
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
              placeholder="Required"
              className="border border-orange-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>
          {(deliveryCharge || 0) > 0 && (
            <div className="text-sm text-orange-700 pb-2">
              <span className="font-medium">Balance after advance:</span>{" "}
              <span className="font-semibold">Rs {balanceAfterAdvance.toLocaleString()}</span>
              <p className="text-xs text-orange-500 mt-0.5">This will be collected later — use Record Payment.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <div className="w-40 shrink-0">
            <label className="block text-xs text-orange-700 mb-1.5">Received In <span className="text-red-600">*</span></label>
            <select
              name="paymentChannel"
              required
              className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Select...</option>
              <option value="JAZZ_CASH">Jazz Cash</option>
              <option value="BANK">Bank</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-orange-700 mb-1.5">Payment Screenshot <span className="text-red-600">*</span></label>
            <input
              type="file"
              name="advanceScreenshot"
              required
              accept="image/*"
              className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 file:mr-3 file:border-0 file:bg-orange-100 file:text-xs file:font-medium file:px-3 file:py-1 file:rounded-md"
            />
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
