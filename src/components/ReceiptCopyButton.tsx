"use client";

import { useState, useEffect, useRef } from "react";
import type { default as Html2CanvasType } from "html2canvas";

export default function ReceiptCopyButton({ targetId }: { targetId: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const h2cRef = useRef<typeof Html2CanvasType | null>(null);

  useEffect(() => {
    import("html2canvas").then((m) => { h2cRef.current = m.default; });
  }, []);

  async function handleSave() {
    const el = document.getElementById(targetId);
    if (!el) return;
    setStatus("working");

    try {
      const html2canvas = h2cRef.current ?? (await import("html2canvas")).default;

      // html2canvas can't parse oklch() (Tailwind v4 colors).
      // Fix: inline all computed colors as rgb() before rendering, then restore.
      const nodes = Array.from(el.querySelectorAll("*")) as HTMLElement[];
      const saved = nodes.map((n) => n.getAttribute("style") ?? "");

      nodes.forEach((n) => {
        const cs = window.getComputedStyle(n);
        n.style.color = cs.color;
        n.style.backgroundColor = cs.backgroundColor;
        n.style.borderColor = cs.borderColor;
        n.style.borderTopColor = cs.borderTopColor;
        n.style.borderRightColor = cs.borderRightColor;
        n.style.borderBottomColor = cs.borderBottomColor;
        n.style.borderLeftColor = cs.borderLeftColor;
      });

      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (node) =>
          node instanceof HTMLElement && node.getAttribute("aria-hidden") === "true",
      });

      // Restore original styles
      nodes.forEach((n, i) => {
        if (saved[i]) n.setAttribute("style", saved[i]);
        else n.removeAttribute("style");
      });

      const dataUrl = canvas.toDataURL("image/png");
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
      {status === "done" && <span className="text-green-600">✓ Saved!</span>}
      {status === "error" && <span className="text-red-500">✕ Try Again</span>}
    </button>
  );
}
