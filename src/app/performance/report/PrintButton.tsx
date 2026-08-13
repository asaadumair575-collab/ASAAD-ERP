"use client";
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors print:hidden"
    >
      🖨 Print
    </button>
  );
}
