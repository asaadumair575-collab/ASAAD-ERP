export function SkeletonLine({ w = "full", h = "4" }: { w?: string; h?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse w-${w} h-${h}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
      <SkeletonLine w="1/3" h="3" />
      <SkeletonLine w="1/2" h="6" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
        <SkeletonLine w="1/4" h="3" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-3.5 flex gap-6">
            <SkeletonLine w="1/4" h="3" />
            <SkeletonLine w="1/3" h="3" />
            <SkeletonLine w="1/5" h="3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PageSkeleton({ cards = 0, rows = 6 }: { cards?: number; rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonLine w="1/4" h="7" />
        <SkeletonLine w="1/3" h="3" />
      </div>
      {cards > 0 && (
        <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(cards, 4)} gap-3`}>
          {Array.from({ length: cards }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}
      <TableSkeleton rows={rows} />
    </div>
  );
}
