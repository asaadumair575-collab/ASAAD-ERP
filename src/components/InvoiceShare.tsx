"use client";

import { useState, useTransition } from "react";
import ProofViewer from "@/components/ProofViewer";

type PaymentEntry = {
  id: number;
  amount: number;
  date: string;
  method: string;
  note: string | null;
  screenshot: string | null;
};

export default function InvoiceShare({
  message,
  email,
  pdfHref,
  saleAmount,
  paidSoFar,
  payments,
  confirmed,
  confirmOrderAction,
  recordPaymentAction,
  deletePaymentAction,
  cancelOrderAction,
}: {
  message: string;
  email?: string | null;
  pdfHref: string;
  saleAmount: number;
  paidSoFar: number;
  payments: PaymentEntry[];
  confirmed: boolean;
  confirmOrderAction?: (formData: FormData) => void;
  recordPaymentAction?: (formData: FormData) => void;
  deletePaymentAction?: (paymentId: number) => Promise<void>;
  cancelOrderAction?: () => void;
}) {
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:${email ?? ""}?subject=${encodeURIComponent(
    "Invoice"
  )}&body=${encodeURIComponent(message)}`;
  const balanceDue = Math.max(0, saleAmount - paidSoFar);
  const fullyPaid = balanceDue <= 0.01;

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex flex-wrap gap-3">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Share via WhatsApp
        </a>
        <a
          href={mailHref}
          className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Share via Email
        </a>
        <a
          href={pdfHref}
          className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Download PDF
        </a>
        {confirmed && cancelOrderAction && paidSoFar === 0 && (
          <form action={cancelOrderAction}>
            <button
              type="submit"
              className="border border-gray-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          </form>
        )}
      </div>

      {!confirmed ? (
        <div className="border border-yellow-200 bg-yellow-50 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-yellow-800">
            This order is still a draft. It will not appear in the
            customer&apos;s ledger or order history until you confirm it.
          </p>
          {confirmOrderAction && (
            <ConfirmOrderForm action={confirmOrderAction} saleAmount={saleAmount} />
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="font-semibold mt-0.5">{saleAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Paid</p>
              <p className="font-semibold mt-0.5">{paidSoFar.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Balance Due</p>
              <p className="font-semibold mt-0.5">{balanceDue.toLocaleString()}</p>
            </div>
            <div className="flex items-end">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  fullyPaid
                    ? "bg-black text-white"
                    : paidSoFar > 0
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {fullyPaid ? "Paid" : paidSoFar > 0 ? "Partially Paid" : "Unpaid"}
              </span>
            </div>
          </div>

          {recordPaymentAction && !fullyPaid && (
            <RecordPaymentForm action={recordPaymentAction} balanceDue={balanceDue} />
          )}

          {payments.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Payment History
              </p>
              <div className="space-y-0">
                {payments.map((p) => (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    deleteAction={deletePaymentAction}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentRow({
  payment: p,
  deleteAction,
}: {
  payment: PaymentEntry;
  deleteAction?: (paymentId: number) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!deleteAction) return;
    startTransition(() => deleteAction(p.id));
  }

  return (
    <div className="flex justify-between items-start text-sm py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500">{p.date.slice(0, 10)}</span>
        <span className="text-xs text-gray-400">
          {p.method === "CASH" ? "Cash" : "Bank Transfer"}
        </span>
        {p.note && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            {p.note}
          </span>
        )}
        {p.screenshot && <ProofViewer src={p.screenshot} />}
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="font-medium">{p.amount.toLocaleString()}</span>
        {deleteAction && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-gray-300 hover:text-red-500 transition-colors"
            title="Delete payment"
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
              onClick={handleDelete}
              disabled={pending}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {pending ? "…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmOrderForm({
  action,
  saleAmount,
}: {
  action: (formData: FormData) => void;
  saleAmount: number;
}) {
  const [mode, setMode] = useState<"credit" | "paid">("credit");
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "CASH">("BANK_TRANSFER");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="mode" value="credit" checked={mode === "credit"} onChange={() => setMode("credit")} />
          Goods sent on credit (no payment yet)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="mode" value="paid" checked={mode === "paid"} onChange={() => setMode("paid")} />
          Payment received
        </label>
      </div>

      {mode === "paid" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="paymentMethod" value="BANK_TRANSFER" checked={paymentMethod === "BANK_TRANSFER"} onChange={() => setPaymentMethod("BANK_TRANSFER")} />
              Bank Transfer
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="paymentMethod" value="CASH" checked={paymentMethod === "CASH"} onChange={() => setPaymentMethod("CASH")} />
              Cash Received
            </label>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Amount Received</label>
              <input type="number" step="0.01" name="amount" defaultValue={saleAmount} required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            {paymentMethod === "BANK_TRANSFER" && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Payment Screenshot</label>
                <input type="file" name="screenshot" accept="image/*" required className="text-sm" />
              </div>
            )}
          </div>
        </div>
      )}

      <button type="submit" disabled={pending}
        className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
        {pending ? "Confirming…" : "Confirm Order"}
      </button>
    </form>
  );
}

function RecordPaymentForm({
  action,
  balanceDue,
}: {
  action: (formData: FormData) => void;
  balanceDue: number;
}) {
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "CASH">("BANK_TRANSFER");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="paymentMethod" value="BANK_TRANSFER" checked={paymentMethod === "BANK_TRANSFER"} onChange={() => setPaymentMethod("BANK_TRANSFER")} />
          Bank Transfer
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="paymentMethod" value="CASH" checked={paymentMethod === "CASH"} onChange={() => setPaymentMethod("CASH")} />
          Cash Received
        </label>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Amount Received</label>
          <input type="number" step="0.01" name="amount" defaultValue={balanceDue} required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Note <span className="text-gray-400">(optional)</span></label>
          <input type="text" name="note" placeholder="e.g. 1st advance, final payment"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        {paymentMethod === "BANK_TRANSFER" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Screenshot</label>
            <input type="file" name="screenshot" accept="image/*" required className="text-sm" />
          </div>
        )}
        <button type="submit" disabled={pending}
          className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {pending ? "Recording…" : "Record Payment"}
        </button>
      </div>
    </form>
  );
}
