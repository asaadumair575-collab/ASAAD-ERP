"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAllRetailOrdersButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handle() {
    if (!confirm("Delete ALL retail orders? This cannot be undone.")) return;
    setLoading(true);
    const res = await fetch("/api/admin/delete-all-ecom-orders", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      alert(`Deleted ${data.deleted} orders.`);
      router.refresh();
    } else {
      alert("Error: " + (data.error ?? "Unknown"));
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="border border-red-200 text-red-500 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? "Deleting…" : "Delete All Orders"}
    </button>
  );
}
