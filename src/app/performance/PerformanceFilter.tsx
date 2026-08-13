"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type User = { id: number; displayName: string | null; username: string };

export default function PerformanceFilter({
  users,
  isAdmin,
}: {
  users: User[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const navigate = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const merged = {
        user: sp.get("user") ?? undefined,
        date: sp.get("date") ?? undefined,
        custom: sp.get("custom") ?? undefined,
        ...overrides,
      };
      if (merged.user) params.set("user", merged.user);
      if (merged.date) params.set("date", merged.date);
      if (merged.custom) params.set("custom", merged.custom);
      router.push(`/performance?${params.toString()}`);
    },
    [router, sp]
  );

  const currentDate = sp.get("date") ?? "today";
  const currentUser = sp.get("user") ?? "";
  const customVal = sp.get("custom") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
      {isAdmin && (
        <select
          value={currentUser}
          onChange={(e) => navigate({ user: e.target.value || undefined, custom: undefined })}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black min-w-[140px]"
        >
          <option value="">All Employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName ?? u.username}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {(["today", "yesterday"] as const).map((d) => (
          <button
            key={d}
            onClick={() => navigate({ date: d, custom: undefined })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentDate === d
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {d === "today" ? "Today" : "Yesterday"}
          </button>
        ))}
        <button
          onClick={() => navigate({ date: "custom" })}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            currentDate === "custom"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Custom
        </button>
      </div>

      {currentDate === "custom" && (
        <input
          type="date"
          value={customVal}
          onChange={(e) => navigate({ date: "custom", custom: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      )}
    </div>
  );
}
