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
    <div className="flex items-center gap-1">
      <Link
        href={`/dispatch${suffix}`}
        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active === "pending"
            ? "bg-black text-white"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        Pending
      </Link>
      <Link
        href={`/dispatch/dispatched${suffix}`}
        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active === "dispatched"
            ? "bg-black text-white"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        Dispatched
      </Link>
    </div>
  );
}
