"use client";

import { useRef } from "react";

export default function RetailDeleteButton({ action }: { action: () => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <button
        type="button"
        onClick={() => {
          if (confirm("This order will be permanently deleted.")) formRef.current?.requestSubmit();
        }}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        Delete Order
      </button>
    </form>
  );
}
