import Link from "next/link";

export default function InvoiceTabs({
  active,
}: {
  active: "pending" | "paid";
}) {
  return (
    <div className="flex gap-2 border-b border-gray-200">
      <Link
        href="/sales/invoices"
        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
          active === "pending"
            ? "border-black text-black"
            : "border-transparent text-gray-500 hover:text-black"
        }`}
      >
        Pending
      </Link>
      <Link
        href="/sales/invoices/paid"
        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
          active === "paid"
            ? "border-black text-black"
            : "border-transparent text-gray-500 hover:text-black"
        }`}
      >
        Paid
      </Link>
    </div>
  );
}
