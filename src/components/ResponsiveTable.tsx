"use client";

import { useEffect, useRef, type ReactNode } from "react";

// On phones (see .mtable in globals.css) each row becomes a small card and
// every cell shows its column heading as a label. Labels are copied from the
// header row so pages don't have to repeat them.
export default function ResponsiveTable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    const label = () => {
      const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
      table.querySelectorAll("tbody tr").forEach((tr) => {
        [...tr.children].forEach((td, i) => {
          if (td.getAttribute("data-label") !== (heads[i] ?? "")) td.setAttribute("data-label", heads[i] ?? "");
        });
      });
    };
    label();
    const obs = new MutationObserver(label);
    obs.observe(table, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return (
    <div className="sm:overflow-x-auto">
      <table ref={ref} className="mtable w-full text-sm">{children}</table>
    </div>
  );
}
