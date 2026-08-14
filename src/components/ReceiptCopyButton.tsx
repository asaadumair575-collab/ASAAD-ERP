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
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: rect.width,
        height: rect.height,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
      });

      const dataUrl = canvas.toDataURL("image/png");

      // Open image in new tab — user can long-press → Save to Gallery (mobile)
      const win = window.open();
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Receipt</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { background: #f5f5f5; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
              img { max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
              p { margin-top: 16px; font-family: sans-serif; font-size: 13px; color: #888; text-align: center; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Receipt" />
            <p>📱 Press and hold image → Save to Gallery</p>
          </body>
          </html>
        `);
        win.document.close();
        setStatus("done");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Fallback if popup blocked: direct download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "receipt.png";
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
      {status === "done" && <span className="text-green-600">✓ Done!</span>}
      {status === "error" && <span className="text-red-500">✕ Try Again</span>}
    </button>
  );
}
