"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Deleting...
        </>
      ) : "Delete"}
    </button>
  );
}

export default function DeleteButton({
  action,
  label = "Delete",
  message = "This action cannot be undone.",
}: {
  action: () => Promise<void>;
  label?: string;
  message?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-red-600 transition-colors"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white text-black rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-red-600">
                  <path d="M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3Zm0 4v3.5M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-sm">Delete this item?</p>
                <p className="text-sm text-gray-500 mt-0.5">{message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <form action={action} onSubmit={() => setOpen(false)} className="flex-1">
                <DeleteSubmit />
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
