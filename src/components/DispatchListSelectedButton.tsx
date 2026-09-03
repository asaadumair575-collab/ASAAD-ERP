export default function DispatchListSelectedButton({ selectedIds }: { selectedIds: number[] }) {
  const href = `/ecommerce/dispatch/sheet?ids=${selectedIds.join(",")}&print=1`;
  return (
    <a
      href={href}
      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-[#16202E] text-[#16202E] hover:bg-gray-50 transition-colors"
    >
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
        <rect x="2.5" y="3.5" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Dispatch List ({selectedIds.length})
    </a>
  );
}
