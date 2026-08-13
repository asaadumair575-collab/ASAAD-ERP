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
            📱 Is slip ka screenshot lo aur WhatsApp pe customer ko bhejo
          </div>
          <button
            onClick={() => window.print()}
            className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            🖨 Print / Screenshot
          </button>
          <button
            onClick={handleConfirm}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
          >
            ✓ Advance Receive Ho Gayi — Order Banao
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
