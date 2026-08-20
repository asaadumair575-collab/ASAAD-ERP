"use client";

import { useActionState } from "react";
import { createRetailCustomer } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default function NewRetailCustomerForm({
  fromDraft,
  defaults,
}: {
  fromDraft: boolean;
  defaults: { name: string; phone: string; city: string; address: string };
}) {
  const [state, action] = useActionState(createRetailCustomer, null);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="fromDraft" value={fromDraft ? "1" : ""} />

      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
          {state.error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Name <span className="text-black">*</span></label>
          <input
            type="text"
            name="name"
            required
            defaultValue={defaults.name}
            placeholder="e.g. Ahmed Raza"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Phone <span className="text-black">*</span></label>
          <input
            type="tel"
            name="phone"
            required
            defaultValue={defaults.phone}
            placeholder="03xx-xxxxxxx"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">City <span className="text-black">*</span></label>
          <input
            type="text"
            name="city"
            required
            defaultValue={defaults.city}
            placeholder="e.g. Lahore"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Address</label>
          <input
            type="text"
            name="address"
            defaultValue={defaults.address}
            placeholder="e.g. Street 5, Block B, Gulberg"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Notes (optional)</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Any extra info..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <SubmitButton
        pendingText="Saving..."
        className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
      >
        {fromDraft ? "Save Customer & Create Order →" : "Save Customer"}
      </SubmitButton>
    </form>
  );
}
