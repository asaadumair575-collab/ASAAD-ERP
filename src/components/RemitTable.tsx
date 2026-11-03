"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setRemitted } from "@/app/app/actions";
import { Button } from "./ui";

export type RemitRow = { id: number; tracking: string; order: string; customer: string; courier: string; deliveredAt: string; cod: string; remitted: boolean };

export default function RemitTable({ rows }: { rows: RemitRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const run = (remitted: boolean) =>
    start(async () => {
      await setRemitted(selected, remitted);
      setSelected([]);
      router.refresh();
    });
  return (
    <div>
      {selected.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">{selected.length} selected</span>
          <Button size="sm" disabled={pending} onClick={() => run(true)}>Mark payment received</Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(false)}>Mark not received</Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-10 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <input type="checkbox" aria-label="Select all" className="accent-gray-950" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} />
              </th>
              {["Tracking", "Order", "Customer", "Courier", "Delivered", "COD", "Payment"].map((h, i) => (
                <th key={h} className={`px-4 py-2.5 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 border-b border-gray-100">
                  <input type="checkbox" aria-label={`Select ${r.tracking}`} className="accent-gray-950" checked={selected.includes(r.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
                </td>
                <td className="px-4 py-3 border-b border-gray-100 font-mono text-xs">{r.tracking}</td>
                <td className="px-4 py-3 border-b border-gray-100">{r.order}</td>
                <td className="px-4 py-3 border-b border-gray-100">{r.customer}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-gray-600">{r.courier}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-gray-500">{r.deliveredAt}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-right tabular-nums">{r.cod}</td>
                <td className="px-4 py-3 border-b border-gray-100">{r.remitted ? <span className="text-green-700">Received</span> : <span className="text-amber-700">Pending</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
