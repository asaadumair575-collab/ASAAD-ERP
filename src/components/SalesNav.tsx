"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function SalesNav() {
  const pathname = usePathname();
  const isOnSales = pathname.startsWith("/sales");
  const [open, setOpen] = useState(isOnSales);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <span>Sales</span>
        <span className="text-xs">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-1 ml-3 space-y-1 border-l border-white/10 pl-3">
          <Link
            href="/sales/invoices"
            className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Invoicing
          </Link>
          <Link
            href="/sales/products"
            className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Products
          </Link>
        </div>
      )}
    </div>
  );
}
