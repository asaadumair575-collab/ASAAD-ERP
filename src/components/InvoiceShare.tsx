"use client";

export default function InvoiceShare({
  message,
  email,
}: {
  message: string;
  email?: string | null;
}) {
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:${email ?? ""}?subject=${encodeURIComponent(
    "Invoice"
  )}&body=${encodeURIComponent(message)}`;

  return (
    <div className="flex gap-3 print:hidden">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Share via WhatsApp
      </a>
      <a
        href={mailHref}
        className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Share via Email
      </a>
      <button
        onClick={() => window.print()}
        className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Print
      </button>
    </div>
  );
}
