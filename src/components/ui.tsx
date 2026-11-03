import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import ResponsiveTable from "./ResponsiveTable";

// Small, plain building blocks shared by every page.

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 bg-white border border-gray-200/70 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>{children}</div>;
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <h2 className="text-[15px] font-semibold text-gray-950">{title}</h2>
      {action}
    </div>
  );
}

const CHIP = {
  dark: "bg-gray-950 text-white",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-500",
} as const;
export type ChipTone = keyof typeof CHIP;

export function IconChip({ icon: Icon, tone = "dark", size = "md" }: { icon: LucideIcon; tone?: ChipTone; size?: "sm" | "md" }) {
  return (
    <span className={`${size === "sm" ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl"} flex items-center justify-center shrink-0 ${CHIP[tone]}`}>
      <Icon className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} strokeWidth={1.75} />
    </span>
  );
}

export function Stat({ label, value, hint, tone, icon, chip = "dark" }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "bad" | "warn"; icon?: LucideIcon; chip?: ChipTone;
}) {
  const toneCls = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-500" : tone === "warn" ? "text-amber-600" : "text-gray-500";
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        {icon ? <IconChip icon={icon} tone={chip} /> : <p className="text-sm text-gray-500">{label}</p>}
        {hint && icon && <span className={`hidden sm:block text-xs font-medium text-right ${toneCls}`}>{hint}</span>}
      </div>
      <p className={`text-lg sm:text-2xl font-bold tracking-tight text-gray-950 tabular-nums break-words ${icon ? "mt-3 sm:mt-4" : "mt-1"}`}>{value}</p>
      {icon && <p className="text-sm text-gray-500 mt-0.5">{label}</p>}
      {hint && icon && <p className={`sm:hidden text-xs font-medium mt-1 ${toneCls}`}>{hint}</p>}
      {hint && !icon && <p className={`text-xs mt-1 ${toneCls}`}>{hint}</p>}
    </Card>
  );
}

export function Badge({ children, className = "bg-gray-100 text-gray-700 ring-gray-200" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className.replace(/\bring-\S+/g, "")}`}>{children}</span>;
}

const BTN = {
  primary: "bg-gray-950 text-white hover:bg-gray-800 shadow-sm",
  secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-sm",
  danger: "bg-white text-red-600 border border-gray-200 hover:bg-red-50",
  ghost: "text-gray-600 hover:bg-gray-100",
};
export const btn = (variant: keyof typeof BTN = "primary", size: "sm" | "md" = "md") =>
  `inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${
    size === "sm" ? "h-8 px-3 text-xs rounded-lg" : "h-10 px-4 text-sm"
  } ${BTN[variant]}`;

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: keyof typeof BTN; size?: "sm" | "md" }) {
  return <button type="button" {...props} className={`${btn(variant, size)} ${className}`} />;
}

export function LinkButton({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: keyof typeof BTN; size?: "sm" | "md" }) {
  return <Link {...props} className={`${btn(variant, size)} ${className}`} />;
}

export const inputCls =
  "w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950/10 focus:border-gray-400";

// Same look as inputs, but sized to its content (for selects in toolbars).
export const selectCls = inputCls.replace("w-full ", "") + " w-auto";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <ResponsiveTable>{children}</ResponsiveTable>;
}

export function Th({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <th className={`px-5 py-3 text-xs font-medium text-gray-500 bg-gray-50/70 border-y border-gray-100 whitespace-nowrap ${right ? "text-right" : "text-left"} ${className}`}>{children}</th>;
}

export function Td({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-5 py-3.5 border-b border-gray-100 align-middle ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {children && <div className="text-sm text-gray-500 mt-1">{children}</div>}
    </div>
  );
}

export function Tabs({ tabs, active }: { tabs: { href: string; label: string; count?: number; key: string }[]; active: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto mb-4 p-1 bg-white border border-gray-200/70 rounded-xl w-fit max-w-full">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
            active === t.key ? "bg-gray-950 text-white font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className={`ml-1.5 text-xs ${active === t.key ? "text-white/60" : "text-gray-400"}`}>{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const cls = {
    info: "bg-white text-gray-700 border-gray-200",
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-green-50 text-green-800 border-green-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
