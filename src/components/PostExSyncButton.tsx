"use client";

import { useState } from "react";

export default function PostExSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/postex-sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setResult(`Error: ${json.error ?? "Unknown"}`);
      } else {
        const returned = json.results.filter((r: { action: string }) => r.action.startsWith("marked_returned")).length;
        const updated = json.results.filter((r: { action: string }) => r.action.startsWith("updated_")).length;
        const failed = json.results.filter((r: { action: string }) => r.action.startsWith("fetch_failed"));
        const firstError = failed[0]?.action ?? "";
        setResult(`✓ ${json.synced} orders · ${returned} returned · ${updated} updated · ${failed.length} failed${firstError ? ` — ${firstError}` : ""}`);
        if (returned > 0 || updated > 0) setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={sync}
        disabled={loading}
        className="shrink-0 bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {loading ? "Syncing..." : "Sync PostEx"}
      </button>
      {result && <p className="text-xs text-gray-500 max-w-xs text-right">{result}</p>}
    </div>
  );
}
