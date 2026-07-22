"use client";

import { useState, useTransition } from "react";
import SubmitButton from "@/components/SubmitButton";

type Payment = { id: number; amount: number; note: string | null; date: string; screenshot?: string | null };

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RetailPaymentSection({
  orderId,
  balance,
  payments,
  courierCharge,
  recordAction,
  deleteAction,
  updateCourierAction,
  canRecordPayment = false,
  canSetCourier = false,
  canSeeCharges = false,
  isAdmin = false,
}: {
  orderId: number;
  balance: number;
  payments: Payment[];
  courierCharge: number;
  recordAction: (formData: FormData) => void;
  deleteAction: (paymentId: number, orderId: number) => Promise<void>;
  updateCourierAction: (formData: FormData) => void;
  canRecordPayment?: boolean;
  canSetCourier?: boolean;
  canSeeCharges?: boolean;
  isAdmin?: boolean;
}) {
  const [editingCourier, setEditingCourier] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payments</p>

      {/* Postex courier charge */}
      {(canSeeCharges || canSetCourier) && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-blue-700 font-medium">Postex Delivery Charges</p>
          <p className="text-sm font-semibold text-blue-900 mt-0.5">
            {courierCharge > 0 ? `Rs ${fmt(courierCharge)}` : "Not set"}
          </p>
        </div>
        {canSetCourier && !editingCourier && (
          <button
            type="button"
            onClick={() => setEditingCourier(true)}
            className="text-xs text-blue-600 hover:text-blue-800 underline shrink-0"
          >
            {courierCharge > 0 ? "Update" : "Add"}
          </button>
        )}
        {canSetCourier && editingCourier && (
          <form action={updateCourierAction} className="flex items-center gap-2" onSubmit={() => setEditingCourier(false)}>
            <input
              type="number"
              name="courierCharge"
              min="0"
              step="1"
              defaultValue={courierCharge || ""}
              placeholder="e.g. 280"
              className="border border-blue-200 rounded-lg px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              autoFocus
            />
            <button
              type="submit"
              className="text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingCourier(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="space-y-0">
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} orderId={orderId} deleteAction={deleteAction} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {/* Record payment form */}
      {canRecordPayment && balance > 0.01 && (
        <form action={recordAction} encType="multipart/form-data" className="space-y-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Amount (Rs)</label>
              <input
                type="number"
                name="amount"
                min="1"
                step="1"
                placeholder={String(Math.round(balance))}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Note (optional)</label>
              <input
                type="text"
                name="note"
                placeholder="e.g. Postex weekly settlement"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Screenshot <span className="text-black">*</span></label>
            <input
              type="file"
              name="screenshot"
              required
              accept="image/*"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black file:mr-3 file:border-0 file:bg-gray-100 file:text-xs file:font-medium file:px-3 file:py-1 file:rounded-md"
            />
            <p className="text-xs text-gray-400 mt-1">Payment proof (bank transfer / receipt screenshot)</p>
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
  isAdmin,
}: {
  payment: Payment;
  orderId: number;
  deleteAction: (paymentId: number, orderId: number) => Promise<void>;
  isAdmin: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const [showImg, setShowImg] = useState(false);

  return (
    <div className="py-2 border-b border-gray-50 last:border-0 space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-400 text-xs">{p.date.slice(0, 10)}</span>
          {p.note && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.note}</span>
          )}
          {p.screenshot && (
            <button type="button" onClick={() => setShowImg((v) => !v)} className="text-xs text-blue-600 hover:underline">
              {showImg ? "Hide screenshot" : "View screenshot"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-medium">Rs {fmt(p.amount)}</span>
          {isAdmin && !confirming && (
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
      {p.screenshot && showImg && (
        <img src={p.screenshot} alt="Payment screenshot" className="w-full max-w-sm rounded-xl border border-gray-200 mt-1" />
      )}
    </div>
  );
}
