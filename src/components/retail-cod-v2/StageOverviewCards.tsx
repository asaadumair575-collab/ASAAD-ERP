import Link from "next/link";
import { STAGES } from "@/lib/retail-cod-v2/stages";
import { STAGE_META } from "@/lib/retail-cod-v2/stageMeta";

const STAGE_HREF: Record<string, string> = {
  PENDING: "/retail-cod-new/pending",
  CONFIRMED: "/retail-cod-new/confirmed",
  HOLD: "/retail-cod-new/hold",
  READY_TO_PACK: "/retail-cod-new/ready-to-pack",
  PACKED_DISPATCH: "/retail-cod-new/packed-dispatch",
};

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function StageOverviewCards({ counts }: { counts: Record<string, { count: number; value: number }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {STAGES.map((stage) => {
        const meta = STAGE_META[stage];
        const Icon = meta.icon;
        const stat = counts[stage] ?? { count: 0, value: 0 };
        return (
          <Link
            key={stage}
            href={STAGE_HREF[stage]}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center mb-2.5 ${meta.bg} ${meta.color}`}>
              <Icon className="w-4 h-4" />
            </span>
            <p className="text-2xl font-bold text-[#16202E] tabular-nums">{stat.count}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{meta.label}</p>
            <p className="text-[11px] text-gray-400 mt-1 tabular-nums">Rs {fmt(stat.value)}</p>
          </Link>
        );
      })}
    </div>
  );
}
