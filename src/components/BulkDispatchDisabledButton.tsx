"use client";

export default function BulkDispatchDisabledButton() {
  return (
    <button
      onClick={() => alert("This feature is under build process.")}
      className="border border-gray-200 text-gray-400 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      ↓ Bulk Dispatch
    </button>
  );
}
