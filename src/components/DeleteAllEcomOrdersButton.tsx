"use client";

export default function DeleteAllEcomOrdersButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Saare ecommerce orders delete ho jayenge. Sure ho?")) e.preventDefault();
      }}
    >
      <button type="submit" className="shrink-0 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
        Delete All Orders
      </button>
    </form>
  );
}
