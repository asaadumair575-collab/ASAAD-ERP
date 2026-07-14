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
  Legend,
} from "recharts";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function truncate(s: string, max = 13) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Daily trend ────────────────────────────────────────────────────────────────

export type DailyTrendPoint = { date: string; billed: number; received: number };

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          <span className="font-semibold">Rs {fmt(p.value)}</span> {p.name}
        </p>
      ))}
    </div>
  );
}

export function RetailDailyChart({ data }: { data: DailyTrendPoint[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 36 }} barSize={14} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#71717a" }}
          angle={-35}
          textAnchor="end"
          interval={Math.max(0, Math.floor(data.length / 10) - 1)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => "Rs " + fmt(v)}
          tick={{ fontSize: 10, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ fill: "#f9fafb" }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="billed" name="Billed" fill="#18181b" radius={[3, 3, 0, 0]} />
        <Bar dataKey="received" name="Received" fill="#16a34a" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Revenue by product ─────────────────────────────────────────────────────────

export type ProductRevenuePoint = { name: string; revenue: number; qty: number };

function ProductTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-gray-800"><span className="font-semibold">Rs {fmt(payload[0]?.value ?? 0)}</span> revenue</p>
    </div>
  );
}

const COLORS = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#1d4ed8", "#2563eb", "#60a5fa", "#16a34a", "#4ade80"];

export function RetailProductChart({ data }: { data: ProductRevenuePoint[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  if (sorted.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: 8, bottom: 36 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tickFormatter={(v) => truncate(v)}
          tick={{ fontSize: 10, fill: "#71717a" }}
          angle={-35}
          textAnchor="end"
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => "Rs " + fmt(v)}
          tick={{ fontSize: 10, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<ProductTooltip />} cursor={{ fill: "#f9fafb" }} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {sorted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Dispatch vs Paid status ────────────────────────────────────────────────────

export type StatusPoint = { label: string; count: number; color: string };

function StatusTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-gray-800 font-semibold">{payload[0]?.value} orders</p>
    </div>
  );
}

export function RetailStatusChart({ data }: { data: StatusPoint[] }) {
  if (data.every((d) => d.count === 0)) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barSize={40}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<StatusTooltip />} cursor={{ fill: "#f9fafb" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
      No data for this period.
    </div>
  );
}
