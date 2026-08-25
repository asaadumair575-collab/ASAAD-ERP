"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MoveToDraftButton({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handle() {
    setLoading(true);
    await fetch("/api/ecom/move-to-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLoading(false);
    setConfirm(false);
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Move to draft?</span>
        <button
          onClick={handle}
          disabled={loading}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 text-white hover:bg-black disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-gray-400 hover:text-gray-700 px-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      title="Move back to Draft"
    >
      ↩ Draft
    </button>
  );
}
