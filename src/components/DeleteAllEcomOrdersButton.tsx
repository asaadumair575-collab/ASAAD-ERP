"use client";

import { useState } from "react";
import { deleteAllEcomOrders } from "@/lib/actions";

const CONFIRM_TEXT = "DELETE RETAIL COD";

export default function DeleteAllEcomOrdersButton({ orderCount }: { orderCount: number }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (orderCount === 0) {
    return <p className="text-sm text-gray-400">No Retail COD orders to delete.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        Delete All Retail COD Orders
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-800">
        This permanently deletes all <strong>{orderCount}</strong> Retail COD orders — draft and confirmed —
        along with their items, payments, and status logs. This does <strong>not</strong> affect Retail Advance
        (wholesale) or any other module. This cannot be undone.
      </p>
      <p className="text-xs text-red-700">
        Type <code className="bg-red-100 px-1 py-0.5 rounded">{CONFIRM_TEXT}</code> to confirm:
      </p>
      <form
        action={async (formData) => {
          setError(null);
          setPending(true);
          try {
            await deleteAllEcomOrders(formData);
            setOpen(false);
            setConfirmation("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete");
          } finally {
            setPending(false);
          }
        }}
        className="flex gap-2"
      >
        <input
          name="confirmation"
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={CONFIRM_TEXT}
          className="flex-1 bg-white border border-red-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          type="submit"
          disabled={confirmation !== CONFIRM_TEXT || pending}
          className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Deleting…" : "Confirm Delete"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setConfirmation(""); setError(null); }}
          className="text-sm text-gray-500 hover:text-gray-700 px-3"
        >
          Cancel
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
