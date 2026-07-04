import Link from "next/link";

export default function InvoiceTabs({
  active,
}: {
  active: "pending" | "paid";
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
