"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

export type MonthlyStat = {
  month: string;
  sales: number;
  received: number;
};

export type CityData = {
  city: string;
  clients: number;
  orders: number;
  sale: number;
};

export type PaymentStatusData = {
  name: string;
  value: number;
  color: string;
};

export type LeadStatusData = {
  name: string;
  value: number;
  color: string;
};

function fmt(n: number) {
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toFixed(0);
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-gray-600">
          <span style={{ color: p.color }} className="font-semibold">■ </span>
          {p.name}:{" "}
          <span className="font-semibold tabular-nums">
            {typeof p.value === "number" && p.value > 500
              ? "Rs " + p.value.toLocaleString()
              : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

export function SalesBarChart({ data }: { data: MonthlyStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="sales" name="Total Sale" fill="#09090b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="received" name="Received" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrendChart({ data }: { data: MonthlyStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line dataKey="sales" name="Total Sale" stroke="#09090b" strokeWidth={2} dot={false} />
        <Line dataKey="received" name="Received" stroke="#a1a1aa" strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PaymentStatusPie({ data }: { data: PaymentStatusData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          dataKey="value"
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LeadStatusPie({ data }: { data: LeadStatusData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          dataKey="value"
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CityBarChart({ data }: { data: CityData[] }) {
  const top = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis dataKey="city" type="category" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="sale" name="Sales" fill="#09090b" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
