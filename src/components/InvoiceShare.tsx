"use client";

export default function InvoiceShare({
  message,
  email,
  markPaymentReceivedAction,
  isPaid,
}: {
  message: string;
  email?: string | null;
  markPaymentReceivedAction?: () => void;
  isPaid?: boolean;
}) {
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const mailHref = `mailto:${email ?? ""}?subject=${encodeURIComponent(
    "Invoice"
  )}&body=${encodeURIComponent(message)}`;

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
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
        className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Download PDF
      </button>
      {markPaymentReceivedAction && !isPaid && (
        <form action={markPaymentReceivedAction}>
          <button
            type="submit"
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Mark Payment Received
          </button>
        </form>
      )}
      {isPaid && (
        <span className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 text-gray-600">
          Payment Received
        </span>
      )}
    </div>
  );
}
