"use client";
import { useState, useTransition } from "react";
import { upsertClientProductRate, deleteClientProductRate } from "@/lib/actions";

type ProductRate = { productId: number; productName: string; rate: number };
type Product = { id: number; name: string };

export default function QuickFixedRateToggle({
  clientId,
  products,
  existingRates,
}: {
  clientId: number;
  defaultEnabled: boolean;
  defaultAmount: number | null;
  products: Product[];
  existingRates: ProductRate[];
}) {
  const [rates, setRates] = useState<ProductRate[]>(existingRates);
  const [adding, setAdding] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [rateInput, setRateInput] = useState("");
  const [pending, start] = useTransition();

  const usedProductIds = new Set(rates.map((r) => r.productId));
  const availableProducts = products.filter((p) => !usedProductIds.has(p.id));

  function handleAdd() {
    const productId = parseInt(selectedProductId);
    const rate = parseFloat(rateInput);
    if (!productId || !rate) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    start(async () => {
      await upsertClientProductRate(clientId, productId, rate);
      setRates((prev) => {
        const existing = prev.find((r) => r.productId === productId);
        if (existing) return prev.map((r) => r.productId === productId ? { ...r, rate } : r);
        return [...prev, { productId, productName: product.name, rate }];
      });
      setAdding(false);
      setSelectedProductId("");
      setRateInput("");
    });
  }

  function handleDelete(productId: number) {
    start(async () => {
      await deleteClientProductRate(clientId, productId);
      setRates((prev) => prev.filter((r) => r.productId !== productId));
    });
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Fixed Rates</p>
          <p className="text-xs text-gray-500 mt-0.5">Product-specific rates for this customer</p>
        </div>
        {availableProducts.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-violet-700 bg-white border border-violet-200 px-3 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
          >
            + Add Rate
          </button>
        )}
      </div>

      {/* Existing rates */}
      {rates.length > 0 && (
        <div className="space-y-1.5">
          {rates.map((r) => (
            <div key={r.productId} className="flex items-center justify-between bg-white border border-violet-100 rounded-xl px-3 py-2">
              <span className="text-sm font-medium text-gray-800">{r.productName}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-violet-700">₨{r.rate}<span className="text-xs font-normal text-violet-400">/dz</span></span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.productId)}
                  disabled={pending}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rates.length === 0 && !adding && (
        <p className="text-xs text-gray-400">Koi fixed rate set nahi — click "+ Add Rate" to add one.</p>
      )}

      {/* Add new rate form */}
      {adding && (
        <div className="bg-white border border-violet-200 rounded-xl p-3 space-y-2">
          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            >
              <option value="">Select product…</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Rate (per dozen) ₨</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="e.g. 1550"
              className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending || !selectedProductId || !rateInput}
              className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setSelectedProductId(""); setRateInput(""); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
