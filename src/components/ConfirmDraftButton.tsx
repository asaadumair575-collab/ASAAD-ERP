"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmDraftButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handle() {
    setLoading(true);
    await fetch("/api/ecom/confirm-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs font-medium px-3 py-1 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
    >
      {loading ? "…" : "Confirm"}
    </button>
  );
}
