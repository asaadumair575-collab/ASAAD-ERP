"use client";

import { useRouter } from "next/navigation";

export default function DispatchTypeSelect({
  type,
}: {
  type: "client" | "commission";
}) {
  const router = useRouter();

  return (
    <select
      value={type}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v === "commission" ? "/dispatch?type=commission" : "/dispatch");
      }}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
    >
      <option value="client">Client Orders</option>
      <option value="commission">Commission Orders</option>
    </select>
  );
}
