"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type PostexDailyPoint = {
  date: string; // display label, e.g. "12 Sep"
  parcels: number;
  amount: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: PostexDailyPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-[#16202E]"><span className="font-semibold">{d.parcels}</span> parcels</p>
      <p className="text-xs text-gray-400">Rs {fmt(d.amount)} total value</p>
    </div>
  );
}

export default function PostexAnalyticsCharts({ data }: { data: PostexDailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barSize={16}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} width={32} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => "Rs " + fmt(v)} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<DailyTooltip />} cursor={{ fill: "#f9fafb" }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar yAxisId="left" dataKey="parcels" name="Parcels Booked" fill="#16202E" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="right" dataKey="amount" name="Value (Rs)" fill="#BFD732" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
