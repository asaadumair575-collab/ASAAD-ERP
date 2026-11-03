import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Small, plain building blocks shared by every page.

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>{children}</div>;
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "bad" | "warn" }) {
  const toneCls = tone === "good" ? "text-green-700" : tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-gray-500";
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
      {hint && <p className={`text-xs mt-1 ${toneCls}`}>{hint}</p>}
    </Card>
  );
}

export function Badge({ children, className = "bg-gray-100 text-gray-700 ring-gray-200" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${className}`}>{children}</span>;
}

const BTN = {
  primary: "bg-gray-900 text-white hover:bg-gray-700",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
  danger: "bg-white text-red-600 border border-gray-300 hover:bg-red-50",
  ghost: "text-gray-600 hover:bg-gray-100",
};
export const btn = (variant: keyof typeof BTN = "primary", size: "sm" | "md" = "md") =>
  `inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${
    size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm"
  } ${BTN[variant]}`;

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: keyof typeof BTN; size?: "sm" | "md" }) {
  return <button type="button" {...props} className={`${btn(variant, size)} ${className}`} />;
}

export function LinkButton({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: keyof typeof BTN; size?: "sm" | "md" }) {
  return <Link {...props} className={`${btn(variant, size)} ${className}`} />;
}

export const inputCls =
  "w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400";

// Same look as inputs, but sized to its content (for selects in toolbars).
export const selectCls = inputCls.replace("w-full ", "") + " w-auto";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <th className={`px-4 py-2.5 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap ${right ? "text-right" : "text-left"} ${className}`}>{children}</th>;
}

export function Td({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-4 py-3 border-b border-gray-100 align-middle ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
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
    <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-4">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
            active === t.key ? "border-gray-900 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-xs text-gray-400">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const cls = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-green-50 text-green-800 border-green-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
  }[tone];
  return <div className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}
