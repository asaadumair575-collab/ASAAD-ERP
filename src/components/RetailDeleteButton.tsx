"use client";

export default function RetailDeleteButton({ action }: { action: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("This order will be permanently deleted.")) action();
      }}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
    >
      Delete Order
    </button>
  );
}
