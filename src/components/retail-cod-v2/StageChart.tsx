"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { STAGE_META } from "@/lib/retail-cod-v2/stageMeta";
import { STAGES } from "@/lib/retail-cod-v2/stages";

export default function StageChart({ counts }: { counts: Record<string, { count: number; value: number }> }) {
  const data = STAGES.map((stage) => ({
    stage,
    label: STAGE_META[stage].label,
    count: counts[stage]?.count ?? 0,
    color: STAGE_META[stage].chartColor,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Orders by Stage</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.stage} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
