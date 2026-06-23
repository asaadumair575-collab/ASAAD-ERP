import Link from "next/link";

export default function DispatchTabs({
  active,
  type = "client",
}: {
  active: "pending" | "dispatched";
  type?: "client" | "commission";
}) {
  const suffix = type === "commission" ? "?type=commission" : "";

  return (
    <div className="flex gap-2 border-b border-gray-200">
      <Link
        href={`/dispatch${suffix}`}
        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
          active === "pending"
            ? "border-black text-black"
            : "border-transparent text-gray-500 hover:text-black"
        }`}
      >
        Pending
      </Link>
      <Link
        href={`/dispatch/dispatched${suffix}`}
        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
          active === "dispatched"
            ? "border-black text-black"
            : "border-transparent text-gray-500 hover:text-black"
        }`}
      >
        Dispatched
      </Link>
    </div>
  );
}
