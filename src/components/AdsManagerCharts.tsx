"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

export type AdsDailyPoint = {
  date: string; // display label, e.g. "12 Sep"
  spend: number;
  revenue: number;
  roas: number;
  orders: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function PerformanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload: AdsDailyPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const orders = payload[0]?.payload.orders ?? 0;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          <span className="font-semibold">Rs {fmt(p.value)}</span> {p.name}
        </p>
      ))}
      <p className="text-xs text-gray-400 pt-0.5">{orders} order{orders === 1 ? "" : "s"}</p>
    </div>
  );
}

function RoasTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: AdsDailyPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-[#16202E]">
        <span className="font-semibold">{d.roas.toFixed(2)}x</span> ROAS
      </p>
      <p className="text-xs text-gray-400">Rs {fmt(d.revenue)} revenue / Rs {fmt(d.spend)} spend</p>
    </div>
  );
}

const TABS = [
  { key: "performance", label: "Spend vs Revenue" },
  { key: "roas", label: "ROAS Trend" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdsManagerCharts({ data }: { data: AdsDailyPoint[] }) {
  const [tab, setTab] = useState<TabKey>("performance");

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
        No daily data for this period.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-[#16202E] text-[#BFD732] shadow-sm"
                : "bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "performance" ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barSize={16} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => "Rs " + fmt(v)}
              tick={{ fontSize: 10, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip content={<PerformanceTooltip />} cursor={{ fill: "#f9fafb" }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="spend" name="Ad Spend" fill="#1877F2" radius={[3, 3, 0, 0]} />
            <Bar dataKey="revenue" name="Revenue" fill="#BFD732" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `${v}x`}
              tick={{ fontSize: 10, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<RoasTooltip />} cursor={{ stroke: "#e4e4e7" }} />
            <ReferenceLine y={1} stroke="#d4d4d8" strokeDasharray="4 4" label={{ value: "Break-even", fontSize: 10, fill: "#a1a1aa", position: "insideTopLeft" }} />
            <Line
              type="monotone"
              dataKey="roas"
              name="ROAS"
              stroke="#16202E"
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; index?: number; payload?: AdsDailyPoint }) => {
                const { cx, cy, index, payload } = props;
                if (cx == null || cy == null || !payload) return <g key={`dot-${index}`} />;
                const color = payload.roas >= 2 ? "#10b981" : payload.roas > 0 ? "#f59e0b" : "#a1a1aa";
                return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3.5} fill={color} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
