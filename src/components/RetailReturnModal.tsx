"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

export default function RetailReturnModal({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

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
              <p className="font-semibold text-sm">Mark Order as Returned?</p>
              <p className="text-xs text-gray-500 mt-0.5">Parcel wapas aa gaya — ye order Returned mark ho jayega.</p>
            </div>

            <form action={action} className="flex gap-2 pt-1" onSubmit={() => setOpen(false)}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <SubmitButton
                pendingText="Saving..."
                className="flex-1 bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-red-700 transition-colors"
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
