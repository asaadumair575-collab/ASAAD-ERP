"use client";

import { useState } from "react";
import WeightVerifyScanner from "@/components/WeightVerifyScanner";

export default function ScanAndWeighModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#232F42] transition-colors flex items-center gap-1.5"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <path d="M3 6.5V4.5A1.5 1.5 0 0 1 4.5 3h2M13.5 3h2A1.5 1.5 0 0 1 17 4.5v2M17 13.5v2a1.5 1.5 0 0 1-1.5 1.5h-2M6.5 17h-2A1.5 1.5 0 0 1 3 15.5v-2M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Scan &amp; Weigh
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-gray-50">
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#16202E] px-4 py-3.5 flex items-center justify-between shadow-sm">
              <h2 className="text-base font-bold text-white">Scan &amp; Weigh</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#BFD732] p-1.5 -mr-1.5 rounded-lg hover:bg-white/10"
                aria-label="Close"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-w-lg mx-auto">
              <WeightVerifyScanner />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
