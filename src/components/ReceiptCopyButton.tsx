"use client";

import { useState, useEffect, useRef } from "react";
import type { default as Html2CanvasType } from "html2canvas";

export default function ReceiptCopyButton({ targetId }: { targetId: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const h2cRef = useRef<typeof Html2CanvasType | null>(null);

  // Pre-load html2canvas so it's ready when user taps
  useEffect(() => {
    import("html2canvas").then((m) => { h2cRef.current = m.default; });
  }, []);

  async function handleSave() {
    const el = document.getElementById(targetId);
    if (!el) return;
    setStatus("working");

    try {
      const html2canvas = h2cRef.current ?? (await import("html2canvas")).default;

      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (node) =>
          node instanceof HTMLElement && node.getAttribute("aria-hidden") === "true",
      });

      // toDataURL is synchronous — no gesture timeout issue
      const dataUrl = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "receipt.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrMsg(msg);
      setStatus("error");
      setTimeout(() => { setStatus("idle"); setErrMsg(""); }, 8000);
    }
  }

  return (
    <div className="flex flex-col items-end">
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
      {status === "error" && <span className="text-red-500">✕ Error</span>}
    </button>
    {status === "error" && errMsg && (
      <p className="text-xs text-red-400 mt-1 max-w-xs break-words">{errMsg}</p>
    )}
    </div>
  );
}
