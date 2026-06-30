"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

export default function ConfirmClientModal({
  confirmAction,
  defaultName,
  triggerClassName,
  triggerLabel = "Confirm as Client",
}: {
  confirmAction: (formData: FormData) => Promise<void>;
  defaultName?: string | null;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "text-xs font-medium text-black hover:underline"}
      >
        {triggerLabel}
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
            <h2 className="font-semibold text-base">Confirm as client</h2>
            <p className="text-sm text-gray-500">
              What&apos;s the person&apos;s name?
            </p>
            <form
              action={(formData) => {
                confirmAction(formData);
                setOpen(false);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                name="name"
                defaultValue={defaultName ?? ""}
                placeholder="Person's name"
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
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
                  pendingText="Confirming..."
                  className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Confirm
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
