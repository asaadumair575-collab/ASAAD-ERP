"use client";

import { useState, useRef, useEffect } from "react";

function pad(n: number) { return String(n).padStart(2, "0"); }
function toYMD(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseYMD(s: string) { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }

const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function DateRangePicker({ from, to }: { from?: string | null; to?: string | null }) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [start, setStart] = useState<string>(from ?? "");
  const [end, setEnd] = useState<string>(to ?? "");
  const [hover, setHover] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function pickDay(ymd: string) {
    if (!start || (start && end)) {
      setStart(ymd); setEnd("");
    } else {
      if (ymd < start) { setEnd(start); setStart(ymd); }
      else { setEnd(ymd); }
    }
  }

  function apply() {
    if (start && end) {
      // submit the form
      const form = ref.current?.closest("form");
      if (form) {
        (form.querySelector('input[name="from"]') as HTMLInputElement).value = start;
        (form.querySelector('input[name="to"]') as HTMLInputElement).value = end;
        form.requestSubmit();
      }
      setOpen(false);
    }
  }

  function clear() {
    setStart(""); setEnd("");
    const form = ref.current?.closest("form");
    if (form) {
      (form.querySelector('input[name="from"]') as HTMLInputElement).value = "";
      (form.querySelector('input[name="to"]') as HTMLInputElement).value = "";
      form.requestSubmit();
    }
    setOpen(false);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${viewYear}-${pad(viewMonth+1)}-${pad(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  function dayClass(ymd: string | null) {
    if (!ymd) return "";
    const inRange = start && (end || hover) && ymd > start && ymd < (end || hover);
    const isStart = ymd === start;
    const isEnd = ymd === end;
    const isHover = !end && ymd === hover;
    if (isStart || isEnd) return "bg-black text-white rounded-full font-semibold";
    if (inRange) return "bg-gray-100 text-gray-800";
    if (isHover) return "bg-gray-200 rounded-full";
    return "text-gray-700 hover:bg-gray-100 rounded-full";
  }

  const labelFrom = from ? parseYMD(from).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : null;
  const labelTo   = to   ? parseYMD(to).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : null;

  return (
    <div ref={ref} className="relative">
      {/* Hidden inputs for form */}
      <input type="hidden" name="from" value={from ?? ""} />
      <input type="hidden" name="to"   value={to ?? ""} />

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
          from || to
            ? "bg-black text-white border-black"
            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
        }`}
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <span className="font-medium">
          {labelFrom && labelTo ? `${labelFrom} → ${labelTo}` : labelFrom ? `${labelFrom} →` : "Date Range"}
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>)}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((ymd, i) => (
              <div key={i} className="flex items-center justify-center">
                {ymd ? (
                  <button
                    type="button"
                    onClick={() => pickDay(ymd)}
                    onMouseEnter={() => { if (start && !end) setHover(ymd); }}
                    onMouseLeave={() => setHover("")}
                    className={`w-8 h-8 text-xs flex items-center justify-center transition-colors ${dayClass(ymd)}`}
                  >
                    {parseInt(ymd.split("-")[2])}
                  </button>
                ) : <div className="w-8 h-8" />}
              </div>
            ))}
          </div>

          {/* Status / actions */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">
              {!start ? "Click start date" : !end ? "Click end date" : `${start} → ${end}`}
            </span>
            <div className="flex gap-1.5">
              {(from || to) && (
                <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg transition-colors">
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={apply}
                disabled={!start || !end}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
