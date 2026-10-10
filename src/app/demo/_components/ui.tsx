"use client";

import Link from "next/link";
import type { InvoiceStatus } from "@/lib/demo/data";

export const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
export const compact = (n: number) =>
  n >= 10_000_000 ? `${+(n / 10_000_000).toFixed(1)}Cr` : n >= 100_000 ? `${+(n / 100_000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
export const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-[#E9ECF0] rounded-2xl shadow-sm ${className}`}>{children}</div>;
}

export function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <h2 className="text-base font-semibold text-gray-900">{children}</h2>
      {right}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-[#FFF1EA] text-[#F15A24]",
  blue: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-500",
} as const;

export function Kpi({
  icon,
  tone,
  label,
  value,
  change,
  note,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  label: string;
  value: React.ReactNode;
  change?: number | null;
  note?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            {icon}
          </svg>
        </span>
        {change != null ? (
          <span className={`text-xs font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        ) : note ? (
          <span className="text-xs font-semibold text-[#F15A24]">{note}</span>
        ) : null}
      </div>
      <div className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 mt-4 tabular-nums">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </Card>
  );
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700",
  Partial: "bg-amber-50 text-amber-700",
  Unpaid: "bg-gray-100 text-gray-600",
  Overdue: "bg-red-50 text-red-600",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>{status}</span>;
}

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "bg-[#F15A24] hover:bg-[#D9480F] text-white shadow-sm"
      : "bg-white border border-[#E9ECF0] text-gray-700 hover:bg-gray-50";
  const base = `inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 ${cls}`;
  return href ? (
    <Link href={href} className={base}>
      {children}
    </Link>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}

export const inputCls =
  "w-full h-10 px-3 bg-white border border-[#E9ECF0] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F15A24]/30 focus:border-[#F15A24]/50";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`py-3 px-5 text-xs font-medium text-gray-500 whitespace-nowrap ${right ? "text-right" : "text-left"}`}>{children}</th>;
}

export function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`py-3 px-5 ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export function Loading() {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <span className="w-8 h-8 border-[3px] border-[#F15A24]/20 border-t-[#F15A24] rounded-full animate-spin" />
    </div>
  );
}
