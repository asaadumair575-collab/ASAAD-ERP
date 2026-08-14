"use client";

import { useState } from "react";

export default function ReceiptCopyButton({ targetId }: { targetId: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");

  async function handleSave() {
    const el = document.getElementById(targetId);
    if (!el) return;
    setStatus("working");

    try {
      const html2canvas = (await import("html2canvas")).default;

      const rect = el.getBoundingClientRect();
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: rect.width,
        height: rect.height,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const getBlob = (): Promise<Blob> =>
        new Promise((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
        );

      // Mobile: Web Share API (WhatsApp etc.)
      if (navigator.canShare) {
        const blob = await getBlob();
        const file = new File([blob], "receipt.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Receipt" });
          setStatus("done");
          setTimeout(() => setStatus("idle"), 2000);
          return;
        }
      }

      // Desktop Chrome: copy to clipboard
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = await getBlob();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("done");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Fallback: download file
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `receipt-${targetId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);

    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={status === "working"}
      className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {status === "idle" && (
        <>
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <path d="M13 8V3H7v5H3l7 7 7-7h-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          Save Receipt
        </>
      )}
      {status === "working" && "Generating…"}
      {status === "done" && <span className="text-green-600">✓ Saved!</span>}
      {status === "error" && <span className="text-red-500">✕ Try Again</span>}
    </button>
  );
}
