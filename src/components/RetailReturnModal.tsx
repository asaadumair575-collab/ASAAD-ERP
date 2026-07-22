"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RetailReturnModal({
  action,
  advance,
}: {
  action: (formData: FormData) => void;
  advance: number;
}) {
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState(0);

  const net = advance - cost;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
      >
        Mark as Returned
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="font-semibold text-sm">Mark Order as Returned</p>
              <p className="text-xs text-gray-500 mt-0.5">Parcel wapas aa gaya — delivery cost darj karein</p>
            </div>

            {/* Advance already taken */}
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-green-700">Advance liya hua (Profit)</span>
              <span className="font-semibold text-green-700">Rs {fmt(advance)}</span>
            </div>

            {/* Return delivery cost input */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Return Delivery Cost (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="dummy"
                min="0"
                step="1"
                placeholder="e.g. 300"
                value={cost || ""}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Net calculation */}
            {cost > 0 && (
              <div className={`rounded-xl px-4 py-3 border ${net >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Advance</span>
                  <span className="font-medium text-green-700">+ Rs {fmt(advance)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Delivery Cost</span>
                  <span className="font-medium text-red-600">− Rs {fmt(cost)}</span>
                </div>
                <div className={`flex justify-between text-sm font-bold border-t mt-2 pt-2 ${net >= 0 ? "border-green-200 text-green-700" : "border-red-200 text-red-600"}`}>
                  <span>Net {net >= 0 ? "Profit" : "Loss"}</span>
                  <span>{net >= 0 ? "+" : ""}Rs {fmt(Math.abs(net))}</span>
                </div>
              </div>
            )}

            <form
              action={action}
              className="flex gap-2 pt-1"
              onSubmit={() => setOpen(false)}
            >
              <input type="hidden" name="returnDeliveryCost" value={cost} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <SubmitButton
                pendingText="Saving..."
                className="flex-1 bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                Confirm Return
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
