"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const compact = (n: number) => (n >= 100_000 ? `${+(n / 100_000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export default function OrdersChart({ data }: { data: { label: string; orders: number; sales: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#f1f2f4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis yAxisId="s" tickFormatter={compact} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="o" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            cursor={{ fill: "#f6f7f9" }}
            formatter={(v, name) => (name === "Sales" ? `Rs ${Math.round(Number(v)).toLocaleString("en-PK")}` : v)}
            contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}
          />
          <Bar yAxisId="s" dataKey="sales" name="Sales" fill="#0b0b0f" radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Line yAxisId="o" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2} dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
