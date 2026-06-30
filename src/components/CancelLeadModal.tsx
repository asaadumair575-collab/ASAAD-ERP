"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

export default function CancelLeadModal({
  cancelAction,
}: {
  cancelAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
      >
        Cancel Client
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white text-black rounded-2xl p-5 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-base">Cancel this client?</h2>
            <p className="text-sm text-gray-500">
              Let us know why, so we can keep track of it.
            </p>
            <form
              action={(formData) => {
                cancelAction(formData);
                setOpen(false);
              }}
              className="space-y-3"
            >
              <textarea
                name="reason"
                rows={3}
                placeholder="Reason for cancelling..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <SubmitButton
                  pendingText="Cancelling..."
                  className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Cancel Client
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
