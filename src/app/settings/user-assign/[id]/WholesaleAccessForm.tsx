"use client";

import { useState, useTransition } from "react";
import { updateWholesaleAccess } from "@/lib/actions";

const PAGES = [
  { key: "wh_customers", label: "Customers" },
  { key: "wh_invoicing", label: "Invoicing" },
  { key: "wh_orders", label: "Orders" },
  { key: "wh_products", label: "Products" },
  { key: "wh_finance", label: "Finance" },
  { key: "wh_commission", label: "Commission" },
  { key: "wh_dispatch", label: "Dispatch" },
];

export default function WholesaleAccessForm({
  userId,
  initial,
}: {
  userId: number;
  initial: Record<string, boolean>;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: string) {
    setChecked((c) => ({ ...c, [key]: !c[key] }));
    setSaved(false);
  }

  function save() {
    const fd = new FormData();
    for (const p of PAGES) fd.set(p.key, checked[p.key] ? "1" : "0");
    startTransition(async () => {
      await updateWholesaleAccess(userId, fd);
      setSaved(true);
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Wholesale</p>
        <p className="text-xs text-gray-400 mt-0.5">Which wholesale pages this user can see</p>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PAGES.map((p) => (
          <label
            key={p.key}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-colors ${
              checked[p.key] ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checked[p.key]}
              onChange={() => toggle(p.key)}
              className="w-3.5 h-3.5 accent-white rounded"
            />
            <span className="text-sm font-medium">{p.label}</span>
          </label>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        {saved && <p className="text-xs text-green-600 font-medium">✓ Saved</p>}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="ml-auto bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save Access"}
        </button>
      </div>
    </div>
  );
}
