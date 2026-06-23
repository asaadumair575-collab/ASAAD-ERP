"use client";

import { useState } from "react";

export default function AddShopTabs({
  manual,
  csv,
}: {
  manual: React.ReactNode;
  csv: React.ReactNode;
}) {
  const [tab, setTab] = useState<"manual" | "csv">("manual");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border border-gray-200 rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
            tab === "manual" ? "bg-black text-white" : "text-gray-500 hover:text-black"
          }`}
        >
          Enter Manually
        </button>
        <button
          type="button"
          onClick={() => setTab("csv")}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
            tab === "csv" ? "bg-black text-white" : "text-gray-500 hover:text-black"
          }`}
        >
          Upload CSV / Excel
        </button>
      </div>
      {tab === "manual" ? manual : csv}
    </div>
  );
}
