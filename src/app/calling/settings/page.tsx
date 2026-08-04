"use client";

import { useState, useTransition } from "react";
import { importCallingLeadsFromReorder, importCallingLeadsFromRetail } from "@/lib/actions";

export default function CallingSettingsPage() {
  const [reorderResult, setReorderResult] = useState<string | null>(null);
  const [retailResult, setRetailResult]   = useState<string | null>(null);
  const [reorderPending, startReorder] = useTransition();
  const [retailPending, startRetail]   = useTransition();

  function importReorder() {
    setReorderResult(null);
    startReorder(async () => {
      const count = await importCallingLeadsFromReorder();
      setReorderResult(count > 0 ? `${count} lead${count !== 1 ? "s" : ""} imported.` : "No new leads to import.");
    });
  }

  function importRetail() {
    setRetailResult(null);
    startRetail(async () => {
      const count = await importCallingLeadsFromRetail();
      setRetailResult(count > 0 ? `${count} customer${count !== 1 ? "s" : ""} imported.` : "No new customers to import.");
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Calling Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage calling queue and import leads</p>
      </div>

      {/* Import section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">Import Leads into Queue</h2>

        {/* Reorder import */}
        <div className="flex items-start justify-between gap-4 border border-gray-100 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Reorder Campaign Leads</p>
            <p className="text-xs text-gray-400 mt-0.5">Import all pending/follow-up reorder leads into the calling queue. Skips already-imported leads.</p>
            {reorderResult && (
              <p className="text-xs mt-2 text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">{reorderResult}</p>
            )}
          </div>
          <button
            onClick={importReorder}
            disabled={reorderPending}
            className="shrink-0 bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {reorderPending ? "Importing..." : "Import"}
          </button>
        </div>

        {/* Retail import */}
        <div className="flex items-start justify-between gap-4 border border-gray-100 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Retail Advance Customers</p>
            <p className="text-xs text-gray-400 mt-0.5">Import retail customers who ordered 15+ days ago for re-engagement. Skips already-imported leads.</p>
            {retailResult && (
              <p className="text-xs mt-2 text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">{retailResult}</p>
            )}
          </div>
          <button
            onClick={importRetail}
            disabled={retailPending}
            className="shrink-0 bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {retailPending ? "Importing..." : "Import"}
          </button>
        </div>
      </div>

      {/* Priority info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Queue Priority Order</h2>
        <ol className="space-y-2 text-sm text-gray-600">
          {[
            ["1", "Follow-ups due now", "Customers who asked to be called back at a specific time"],
            ["2", "No-answer retries due", "Customers who didn't pick up — retry window has opened"],
            ["3", "Priority 1 (Shopify)", "Shopify orders needing confirmation"],
            ["4", "Priority 2 (Retail Advance)", "Retail advance customers"],
            ["5", "Priority 3 (COD)", "COD order customers"],
            ["6", "Priority 4 (Reorder)", "Reorder campaign leads"],
            ["7", "Priority 5 (Manual)", "Manually added leads"],
          ].map(([num, title, desc]) => (
            <li key={num} className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{num}</span>
              <div>
                <p className="font-medium text-gray-800 text-xs">{title}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* No-answer retry info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">No-Answer Retry Logic</h2>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex gap-3 items-start">
            <span className="text-yellow-500 mt-0.5">1st</span>
            <p>Retry after <strong>2 hours</strong></p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-orange-500 mt-0.5">2nd</span>
            <p>Retry next morning at <strong>9:00 AM PKT</strong></p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-red-500 mt-0.5">3rd</span>
            <p>Marked as <strong>Unreachable</strong> — removed from queue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
