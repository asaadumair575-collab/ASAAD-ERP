"use client";
import { useRouter } from "next/navigation";

export default function SlipActions({
  confirmed,
  retailUrl,
  confirmAction,
}: {
  confirmed: boolean;
  retailUrl: string;
  confirmAction: () => Promise<void>;
}) {
  const router = useRouter();

  async function handleConfirm() {
    await confirmAction();
    router.push(retailUrl);
  }

  return (
    <div className="space-y-2 print:hidden">
      {!confirmed ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
            📱 Take a screenshot of this slip and send it to the customer on WhatsApp
          </div>
          <button
            onClick={() => window.print()}
            className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Print / Save as PDF
          </button>
          <button
            onClick={handleConfirm}
            className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
          >
            ✓ Advance Received — Create Order
          </button>
        </>
      ) : (
        <button
          onClick={() => router.push(retailUrl)}
          className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
        >
          Retail Order Form Kholo →
        </button>
      )}
    </div>
  );
}
