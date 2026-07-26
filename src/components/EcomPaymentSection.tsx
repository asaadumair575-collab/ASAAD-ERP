"use client";

import { useState, useTransition } from "react";

type Payment = { id: number; amount: number; note: string | null; date: string };

export default function EcomPaymentSection({
  orderId,
  balance,
  cprSettled,
  payments,
  recordAction,
  deleteAction,
  isAdmin,
}: {
  orderId: number;
  balance: number;
  cprSettled: boolean;
  payments: Payment[];
  recordAction: (formData: FormData) => Promise<void>;
  deleteAction: (paymentId: number) => Promise<void>;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function fmt(n: number) {
    return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payments</p>
      </div>

      {payments.length > 0 && (
        <div className="divide-y divide-gray-50">
          {payments.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Rs {fmt(p.amount)}</p>
                {p.note && <p className="text-xs text-gray-400">{p.note}</p>}
                <p className="text-xs text-gray-400">{p.date.slice(0, 10)}</p>
              </div>
              {isAdmin && (
                <form action={() => startTransition(() => deleteAction(p.id))}>
                  <button type="submit" className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {balance > 0 && !cprSettled && (
        <form action={(fd) => startTransition(() => recordAction(fd))} className="p-5 space-y-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Record Payment</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount</label>
              <input name="amount" type="number" step="1" min="1" placeholder="Amount" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
              <input name="note" placeholder="e.g. Bank transfer" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
          <button type="submit" disabled={pending} className="w-full bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50">
            {pending ? "Recording..." : "Record Payment"}
          </button>
        </form>
      )}

      {balance === 0 && payments.length === 0 && (
        <p className="px-5 py-4 text-sm text-gray-400">No payments recorded.</p>
      )}
    </div>
  );
}
