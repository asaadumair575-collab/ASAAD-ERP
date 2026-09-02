"use client";

import { useState } from "react";
import DateRangeNav from "@/components/DateRangeNav";

export default function DispatchReportTrigger({ from, to, basePath }: { from: string; to: string; basePath: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-[#16202E] text-[#BFD732] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#232F42] transition-colors flex items-center gap-2"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Generate Dispatch Report
      </button>
    );
  }

  return <DateRangeNav from={from} to={to} basePath={basePath} />;
}
