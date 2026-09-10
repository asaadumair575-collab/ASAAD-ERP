import { STAGE_META } from "@/lib/retail-cod-v2/stageMeta";
import type { OrderStage } from "@/lib/retail-cod-v2/stages";

export default function StageBadge({ stage }: { stage: string }) {
  const meta = STAGE_META[stage as OrderStage] ?? STAGE_META.PENDING;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {meta.label}
    </span>
  );
}
