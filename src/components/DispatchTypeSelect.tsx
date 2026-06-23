"use client";

import { useRouter, usePathname } from "next/navigation";

export default function DispatchTypeSelect({
  type,
}: {
  type: "client" | "commission";
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      value={type}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v === "commission" ? `${pathname}?type=commission` : pathname);
      }}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
    >
      <option value="client">Client Orders</option>
      <option value="commission">Commission Orders</option>
    </select>
  );
}
