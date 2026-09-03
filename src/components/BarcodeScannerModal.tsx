"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScannerModal({
  open,
  onClose,
  onScanned,
}: {
  open: boolean;
  onClose: () => void;
  onScanned: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result) => {
          if (cancelled || !result) return;
          const text = result.getText().trim();
          if (text) {
            cancelled = true;
            controlsRef.current?.stop();
            onScanned(text);
          }
        }
      )
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not access camera");
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onScanned]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />

      {/* Scan guide frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[80%] max-w-sm aspect-[3/1] border-2 border-[#BFD732] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      </div>

      <div className="absolute top-0 inset-x-0 px-4 py-3.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <p className="text-sm font-semibold text-white">Scan Tracking Barcode</p>
        <button type="button" onClick={onClose} className="text-white p-1.5 rounded-lg hover:bg-white/10" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 py-5 text-center">
        {error ? (
          <p className="text-sm text-red-300 bg-black/50 inline-block px-4 py-2 rounded-lg">{error}</p>
        ) : (
          <p className="text-sm text-white/80">Hold the barcode inside the frame</p>
        )}
      </div>
    </div>
  );
}
