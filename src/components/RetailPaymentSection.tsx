"use client";

import { useState, useTransition } from "react";
import SubmitButton from "@/components/SubmitButton";

type Payment = { id: number; amount: number; note: string | null; date: string };

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RetailPaymentSection({
  orderId,
  balance,
  payments,
  recordAction,
  deleteAction,
}: {
  orderId: number;
  balance: number;
  payments: Payment[];
  recordAction: (formData: FormData) => void;
  deleteAction: (paymentId: number, orderId: number) => Promise<void>;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payments</p>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="space-y-0">
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} orderId={orderId} deleteAction={deleteAction} />
          ))}
        </div>
      )}

      {/* Record payment form */}
      {balance > 0.01 && (
        <form action={recordAction} className="flex flex-wrap gap-3 items-end pt-3 border-t border-gray-100">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Amount (Rs)</label>
            <input
              type="number"
              name="amount"
              min="1"
              step="1"
              defaultValue={Math.round(balance)}
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Note (optional)</label>
            <input
              type="text"
              name="note"
              placeholder="e.g. final payment"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <SubmitButton
            pendingText="Recording..."
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Record Payment
          </SubmitButton>
        </form>
      )}

      {balance <= 0.01 && payments.length === 0 && (
        <p className="text-sm text-gray-400">No payments recorded yet.</p>
      )}
      {balance <= 0.01 && payments.length > 0 && (
        <p className="text-sm text-green-700 font-medium">✓ Fully paid</p>
      )}
    </div>
  );
}

function PaymentRow({
  payment: p,
  orderId,
  deleteAction,
}: {
  payment: Payment;
  orderId: number;
  deleteAction: (paymentId: number, orderId: number) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-400 text-xs">{p.date.slice(0, 10)}</span>
        {p.note && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.note}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium">Rs {fmt(p.amount)}</span>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-gray-300 hover:text-red-500 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M6 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1M3 4h14M8 9v6M12 9v6M4 4l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {confirming && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Delete?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => deleteAction(p.id, orderId))}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {pending ? "…" : "Yes"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
          </div>
        )}
      </div>
    </div>
  );
}
