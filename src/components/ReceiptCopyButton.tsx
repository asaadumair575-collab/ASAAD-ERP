"use client";

import { useState } from "react";

export default function ReceiptCopyButton({ targetId }: { targetId: string }) {
  const [status, setStatus] = useState<"idle" | "copying" | "done" | "error">("idle");

  async function handleCopy() {
    const el = document.getElementById(targetId);
    if (!el) return;
    setStatus("copying");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Canvas toBlob failed");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={status === "copying"}
      className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {status === "idle" && (
        <>
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 13V4a1 1 0 0 1 1-1h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Copy as Image
        </>
      )}
      {status === "copying" && "Copying…"}
      {status === "done" && (
        <span className="text-green-600">✓ Copied!</span>
      )}
      {status === "error" && (
        <span className="text-red-500">Failed — try again</span>
      )}
    </button>
  );
}
