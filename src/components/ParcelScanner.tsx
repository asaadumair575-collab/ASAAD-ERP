"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Parcel = {
  id: number;
  customerName: string;
  phone: string | null;
  city: string | null;
  amount: number;
  items: string;
  alreadyPacked: boolean;
};

type Recent = { orderId: number; trackingNumber: string; grams: number; time: string };
type Phase = "idle" | "looking" | "found" | "not_found" | "already" | "weighing" | "saving" | "error";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function ParcelScanner({ employeeName }: { employeeName: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanValue, setScanValue] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [errorText, setErrorText] = useState("");
  const [recent, setRecent] = useState<Recent[]>([]);
  const [processedToday, setProcessedToday] = useState(0);
  const [pending, setPending] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const currentCn = useRef("");
  const lastScan = useRef<{ cn: string; time: number }>({ cn: "", time: 0 });

  const focusScan = useCallback(() => {
    requestAnimationFrame(() => scanInputRef.current?.focus());
  }, []);

  // Lean, one-shot summary fetch on load — never polled or refetched per scan.
  useEffect(() => {
    fetch("/api/ecom/scanner/summary")
      .then((r) => r.json())
      .then((d) => {
        setProcessedToday(d.processedToday ?? 0);
        setPending(d.pending ?? 0);
      })
      .catch(() => {});
    focusScan();
  }, [focusScan]);

  // Ctrl+K refocuses the scanner from anywhere on the page.
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        focusScan();
      }
    }
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [focusScan]);

  function resetToIdle() {
    setPhase("idle");
    setParcel(null);
    setScanValue("");
    setWeightValue("");
    setErrorText("");
    currentCn.current = "";
    focusScan();
  }

  async function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const cn = scanValue.trim();
    if (!cn) return;

    // Duplicate-scan guard — ignore the same code fired again within 2s
    // (common with scanners that repeat on a held trigger).
    const now = Date.now();
    if (cn === lastScan.current.cn && now - lastScan.current.time < 2000) {
      setScanValue("");
      return;
    }
    lastScan.current = { cn, time: now };

    currentCn.current = cn;
    setPhase("looking");
    setErrorText("");

    try {
      const res = await fetch(`/api/ecom/scanner/lookup?tracking=${encodeURIComponent(cn)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");

      if (!data.found) {
        setPhase("not_found");
        setErrorCount((c) => c + 1);
        setScanValue("");
        focusScan();
        return;
      }
      if (data.order.alreadyPacked) {
        setPhase("already");
        setParcel(data.order);
        setScanValue("");
        focusScan();
        return;
      }

      setParcel(data.order);
      setPhase("found");
      setScanValue("");
      requestAnimationFrame(() => weightInputRef.current?.focus());
    } catch (err) {
      setPhase("error");
      setErrorText(err instanceof Error ? err.message : "Lookup failed");
      setErrorCount((c) => c + 1);
      setScanValue("");
      focusScan();
    }
  }

  async function onWeightKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    await submitWeight();
  }

  async function submitWeight() {
    const g = parseFloat(weightValue);
    if (!g || g <= 0 || !currentCn.current) return;

    setPhase("saving");
    try {
      const res = await fetch("/api/ecom/scanner/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: currentCn.current, weightGrams: g }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setRecent((r) => [
        { orderId: data.orderId, trackingNumber: currentCn.current, grams: g, time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) },
        ...r,
      ].slice(0, 10));
      setProcessedToday((n) => n + 1);
      setPending((n) => Math.max(0, n - 1));
      resetToIdle();
    } catch (err) {
      // Fail-safe: keep the parcel + weight visible, let the employee retry.
      setPhase("error");
      setErrorText(err instanceof Error ? err.message : "Failed to save");
      setErrorCount((c) => c + 1);
      weightInputRef.current?.focus();
    }
  }

  function onKeyDownGlobal(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      resetToIdle();
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4" onKeyDown={onKeyDownGlobal}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#16202E] tracking-tight">Parcel Scanner</h1>
          <p className="text-xs text-gray-400 mt-0.5">{employeeName}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Processed Today</p>
            <p className="text-lg font-bold text-[#16202E] tabular-nums leading-tight">{processedToday}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pending</p>
            <p className="text-lg font-bold text-amber-600 tabular-nums leading-tight">{pending}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Errors</p>
            <p className="text-lg font-bold text-red-500 tabular-nums leading-tight">{errorCount}</p>
          </div>
        </div>
      </div>

      {/* Scan input — always mounted, always focused */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 focus-within:border-[#16202E] transition-colors">
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Scan Parcel</label>
        <input
          ref={scanInputRef}
          type="text"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={onScanKeyDown}
          onBlur={() => {
            // Scanner-first UX: pull focus back unless the employee is
            // deliberately typing the weight.
            if (document.activeElement !== weightInputRef.current) focusScan();
          }}
          placeholder="Scan barcode or enter order number, then press Enter"
          autoFocus
          className="mt-1 w-full border-0 outline-none text-lg font-mono placeholder:text-gray-300"
        />
      </div>

      {/* Status line */}
      <div className="min-h-[1.5rem] text-sm font-semibold">
        {phase === "looking" && <span className="text-gray-400">Scanning…</span>}
        {phase === "not_found" && <span className="text-red-600">Parcel not found</span>}
        {phase === "already" && <span className="text-amber-600">Already processed</span>}
        {phase === "error" && <span className="text-red-600">{errorText} — Retry</span>}
        {phase === "found" && <span className="text-emerald-600">Parcel Found ✓</span>}
        {phase === "saving" && <span className="text-gray-400">Saving…</span>}
      </div>

      {/* Parcel info + weight */}
      {parcel && (phase === "found" || phase === "already" || phase === "saving" || (phase === "error" && weightValue)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#16202E]">Order #{parcel.id}</p>
              {parcel.alreadyPacked && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Already Packed</span>}
            </div>
            <Row label="Customer" value={parcel.customerName} />
            <Row label="Phone" value={parcel.phone ?? "—"} />
            <Row label="City" value={parcel.city ?? "—"} />
            <Row label="Product" value={parcel.items || "—"} />
            <Row label="COD Amount" value={`Rs ${fmt(parcel.amount)}`} />
            <Row label="Courier" value="PostEx" />
          </div>

          <div className="bg-[#16202E] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-wide mb-2">Parcel Weight</p>
            {phase === "already" ? (
              <p className="text-3xl font-bold text-gray-400">—</p>
            ) : (
              <>
                <input
                  ref={weightInputRef}
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  onKeyDown={onWeightKeyDown}
                  disabled={phase === "saving"}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-6xl font-black text-white tabular-nums outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-sm text-gray-400 -mt-1">grams</p>
              </>
            )}

            {phase !== "already" && (
              <button
                type="button"
                onClick={submitWeight}
                disabled={!weightValue || parseFloat(weightValue) <= 0 || phase === "saving"}
                className="mt-4 w-full bg-[#BFD732] text-[#16202E] text-lg font-black py-3 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d4ec4a] transition-colors"
              >
                ✓ DONE
              </button>
            )}
            {phase === "already" && (
              <button type="button" onClick={resetToIdle} className="mt-4 w-full bg-white/10 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-white/20 transition-colors">
                Next Parcel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent scans */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Scans</p>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">No parcels processed yet</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recent.map((r, i) => (
                <tr key={i}>
                  <td className="py-2 px-4 font-semibold text-gray-800">#{r.orderId}</td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-500">{r.trackingNumber}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-600">{r.grams} g</td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{r.time}</td>
                  <td className="py-2 px-4 text-right"><span className="text-emerald-600 text-xs font-semibold">✓ Done</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-center text-[11px] text-gray-300">Ctrl+K to focus scanner · Esc to clear current parcel</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-800 text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
