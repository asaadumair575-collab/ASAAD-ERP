import Link from "next/link";
import { LayoutGrid, Clock, CheckCircle2, PauseCircle, PackageCheck, Truck, LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/retail-cod-new", label: "All Orders", icon: LayoutGrid },
  { href: "/retail-cod-new/pending", label: "Pending", icon: Clock },
  { href: "/retail-cod-new/confirmed", label: "Confirmed", icon: CheckCircle2 },
  { href: "/retail-cod-new/hold", label: "Hold", icon: PauseCircle },
  { href: "/retail-cod-new/ready-to-pack", label: "Ready to Pack", icon: PackageCheck },
  { href: "/retail-cod-new/packed-dispatch", label: "Packed & Dispatch", icon: Truck },
];

export default function PageHeader({ active, title, subtitle }: { active: string; title: string; subtitle: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#16202E]">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.href === active;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                isActive ? "bg-[#16202E] text-[#BFD732]" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
