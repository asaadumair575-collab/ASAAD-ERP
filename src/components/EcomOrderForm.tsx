"use client";

import { useState, useTransition } from "react";

export default function EcomOrderForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [items, setItems] = useState([{ description: "", quantity: "", packSize: "12", rate: "" }]);
  const [pending, startTransition] = useTransition();

  function addItem() {
    setItems([...items, { description: "", quantity: "", packSize: "12", rate: "" }]);
  }
  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  const total = items.reduce((s, it) => {
    const q = parseFloat(it.quantity);
    const r = parseFloat(it.rate);
    return s + (isNaN(q) || isNaN(r) ? 0 : q * r);
  }, 0);

  return (
    <form action={(fd) => startTransition(() => action(fd))} className="space-y-5">
      {/* Date */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Details</p>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Order Date</label>
          <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
            <input name="customerName" required placeholder="Customer name" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
            <input name="phone" placeholder="0300-0000000" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
            <input name="city" placeholder="City" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Tracking Number</label>
            <input name="trackingNumber" placeholder="PostEx tracking number" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
            <input name="notes" placeholder="Optional notes" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Items</p>
          <button type="button" onClick={addItem} className="text-xs font-medium text-black hover:underline">+ Add Item</button>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <div key={i} className="px-5 py-4 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {i === 0 && <label className="text-xs text-gray-400 mb-1 block">Description</label>}
                <input name="itemDescription" value={item.description} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, description: e.target.value } : it))} placeholder="Product name" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="text-xs text-gray-400 mb-1 block">Pack</label>}
                <select name="itemPackSize" value={item.packSize} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, packSize: e.target.value } : it))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                  <option value="3">3</option>
                  <option value="6">6</option>
                  <option value="12">12</option>
                  <option value="24">24</option>
                </select>
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="text-xs text-gray-400 mb-1 block">Qty</label>}
                <input name="itemQuantity" type="number" step="1" min="1" value={item.quantity} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, quantity: e.target.value } : it))} placeholder="1" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div className="col-span-3">
                {i === 0 && <label className="text-xs text-gray-400 mb-1 block">Rate (Rs)</label>}
                <input name="itemRate" type="number" step="1" min="0" value={item.rate} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, rate: e.target.value } : it))} placeholder="0" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-sm font-semibold">Rs {total.toLocaleString("en-PK", { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <button type="submit" disabled={pending} className="w-full bg-black text-white font-medium py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
        {pending ? "Creating..." : "Create Order"}
      </button>
    </form>
  );
}
