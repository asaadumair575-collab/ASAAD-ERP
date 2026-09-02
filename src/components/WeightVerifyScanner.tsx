"use client";

import { useRef, useState } from "react";

type Recent = { trackingNumber: string; time: string; photo: string };

export default function WeightVerifyScanner() {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCn = useRef("");

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const cn = value.trim();
    if (!cn) return;
    pendingCn.current = cn;
    // Open the camera immediately — must be called synchronously in this
    // trusted event handler for the browser to allow it without a click.
    fileInputRef.current?.click();
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const cn = pendingCn.current;
    setPending(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const photo = reader.result as string;
      try {
        const res = await fetch("/api/ecom/weight-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingNumber: cn, photo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save");

        setRecent((r) => [{ trackingNumber: cn, time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }), photo }, ...r].slice(0, 8));
        setMessage({ type: "ok", text: `Saved — ${cn}` });
      } catch (err) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
      } finally {
        setPending(false);
        setValue("");
        inputRef.current?.focus();
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scan Parcel</label>
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={pending}
          placeholder="Scan or type tracking number, then press Enter"
          className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#BFD732] disabled:opacity-50"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          className="hidden"
        />
        {pending && <p className="text-xs text-gray-400 mt-2">Saving…</p>}
        {message && (
          <p className={`text-sm mt-2 font-medium ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
            {message.type === "ok" ? "✓" : "✕"} {message.text}
          </p>
        )}
      </div>

      {recent.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recently Verified ({recent.length})</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {recent.map((r, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={r.photo} alt={r.trackingNumber} title={`${r.trackingNumber} · ${r.time}`} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
