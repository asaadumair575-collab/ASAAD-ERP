"use client";

import { useState } from "react";

export default function PhonePopup({ phone, name }: { phone: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-gray-400 font-mono text-xs hover:text-black hover:underline transition-colors"
      >
        {phone}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-3 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{name}</p>
            <p className="text-4xl font-bold tracking-widest text-gray-900 font-mono select-all">
              {phone}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
