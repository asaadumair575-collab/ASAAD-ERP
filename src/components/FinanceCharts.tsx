"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export type ProductChartData = {
  name: string;
  qty: number;
  revenue: number;
  profit: number | null;
  hasCost: boolean;
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function truncate(s: string, max = 14) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

const BAR_COLORS = [
  "#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8",
  "#0f172a", "#1e3a5f", "#1d4ed8", "#2563eb", "#60a5fa",
];

function CustomTooltip({ active, payload, label, type }: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  type: "qty" | "profit";
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-800 mb-1">{label}</p>
      {type === "qty" ? (
        <p className="text-gray-600">
          <span className="font-semibold text-black">{fmt(val)}</span> units sold
        </p>
      ) : (
        <p className={val >= 0 ? "text-green-700" : "text-red-600"}>
          <span className="font-semibold">Rs {fmt(val)}</span> profit
        </p>
      )}
    </div>
  );
}

export function ProductQtyChart({ data }: { data: ProductChartData[] }) {
  const sorted = [...data].sort((a, b) => b.qty - a.qty).slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: 8, bottom: 40 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tickFormatter={(v) => truncate(v)}
          tick={{ fontSize: 11, fill: "#71717a" }}
          angle={-35}
          textAnchor="end"
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip type="qty" />} cursor={{ fill: "#f9fafb" }} />
        <Bar dataKey="qty" radius={[4, 4, 0, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProductProfitChart({ data }: { data: ProductChartData[] }) {
  const withCost = data.filter((d) => d.hasCost && d.profit != null);
  const sorted = [...withCost].sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0)).slice(0, 10);
  if (sorted.length === 0) return (
    <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
      No product costs set — profit chart unavailable.
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: 8, bottom: 40 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tickFormatter={(v) => truncate(v)}
          tick={{ fontSize: 11, fill: "#71717a" }}
          angle={-35}
          textAnchor="end"
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => "Rs " + fmt(v)}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip content={<CustomTooltip type="profit" />} cursor={{ fill: "#f9fafb" }} />
        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
          {sorted.map((d, i) => (
            <Cell key={i} fill={(d.profit ?? 0) >= 0 ? "#16a34a" : "#dc2626"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProductRevenueChart({ data }: { data: ProductChartData[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: 8, bottom: 40 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tickFormatter={(v) => truncate(v)}
          tick={{ fontSize: 11, fill: "#71717a" }}
          angle={-35}
          textAnchor="end"
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => "Rs " + fmt(v)}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip content={<CustomTooltip type="profit" />} cursor={{ fill: "#f9fafb" }} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
