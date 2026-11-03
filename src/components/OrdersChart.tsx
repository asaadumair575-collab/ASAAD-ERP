"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function OrdersChart({ data }: { data: { label: string; orders: number; sales: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            formatter={(v, name) => (name === "Sales" ? `Rs ${Math.round(Number(v)).toLocaleString("en-PK")}` : v)}
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e5e7eb" }}
          />
          <Bar dataKey="orders" name="Orders" fill="#111827" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
