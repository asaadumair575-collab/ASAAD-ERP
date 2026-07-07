import Link from "next/link";

export default function InvoiceTabs({
  active,
  advanceCount,
}: {
  active: "pending" | "advance" | "paid";
  advanceCount?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/sales/invoices"
        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active === "pending"
            ? "bg-black text-white"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        Pending
      </Link>
      <Link
        href="/sales/invoices/advance"
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active === "advance"
            ? "bg-yellow-400 text-yellow-900"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        Advance
        {advanceCount != null && advanceCount > 0 && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            active === "advance" ? "bg-yellow-900/15 text-yellow-900" : "bg-yellow-100 text-yellow-700"
          }`}>
            {advanceCount}
          </span>
        )}
      </Link>
      <Link
        href="/sales/invoices/paid"
        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active === "paid"
            ? "bg-black text-white"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        Paid
      </Link>
    </div>
  );
}
