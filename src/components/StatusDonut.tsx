"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function StatusDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={total ? data : [{ name: "None", value: 1, color: "#f1f2f4" }]} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={total ? 1.5 : 0} stroke="none">
            {(total ? data : [{ color: "#f1f2f4" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          {total > 0 && <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: "#e5e7eb" }} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-950 tabular-nums">{total}</span>
        <span className="text-xs text-gray-500">orders</span>
      </div>
    </div>
  );
}
