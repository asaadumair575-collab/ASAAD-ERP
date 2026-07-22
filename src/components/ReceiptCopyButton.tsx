"use client";

import { useState } from "react";

export default function ReceiptCopyButton({ targetId }: { targetId: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleShare() {
    const el = document.getElementById(targetId);
    if (!el) return;
    setStatus("working");
    setErrorMsg("");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const dataUrl = canvas.toDataURL("image/png");

      // 1) Try Web Share API (mobile — works with WhatsApp)
      if (navigator.canShare) {
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png")
        );
        const file = new File([blob], "receipt.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Receipt" });
          setStatus("done");
          setTimeout(() => setStatus("idle"), 2000);
          return;
        }
      }

      // 2) Try clipboard (Chrome desktop)
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png")
        );
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("done");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // 3) Final fallback: trigger download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "receipt.png";
      a.click();
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);

    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
      setTimeout(() => { setStatus("idle"); setErrorMsg(""); }, 4000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={status === "working"}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        {status === "idle" && (
          <>
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M13 8V3H7v5H3l7 7 7-7h-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Share / Save Receipt
          </>
        )}
        {status === "working" && "Generating…"}
        {status === "done" && <span className="text-green-600">✓ Done!</span>}
        {status === "error" && <span className="text-red-500">Failed</span>}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
