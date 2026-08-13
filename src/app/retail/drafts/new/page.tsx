import { createDraftOrder } from "@/lib/actions";
import Link from "next/link";

export default function NewDraftPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/retail/drafts" className="text-xs text-gray-400 hover:text-gray-600">← Drafts</Link>
        <h1 className="text-xl font-semibold tracking-tight mt-1">Create Draft Order</h1>
        <p className="text-xs text-gray-400 mt-0.5">A payment slip will be generated to send to the customer</p>
      </div>

      <form action={createDraftOrder} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Customer Name *</label>
            <input
              name="customerName"
              required
              placeholder="e.g. Ahmed Khan"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
            <input
              name="phone"
              type="tel"
              placeholder="03XX-XXXXXXX"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">City</label>
            <input
              name="city"
              placeholder="e.g. Lahore"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Address (optional — can add later)</label>
            <input
              name="address"
              placeholder="Street, area..."
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Items / Order Description</label>
            <textarea
              name="items"
              rows={2}
              placeholder="e.g. 2 dozen balls, assorted colors"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Advance Amount (₨)</label>
            <input
              name="advanceAmount"
              type="number"
              defaultValue="200"
              min="1"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Generate Slip →
        </button>
      </form>
    </div>
  );
}
