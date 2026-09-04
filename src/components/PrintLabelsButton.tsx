export default function PrintLabelsButton({ selectedIds }: { selectedIds: number[] }) {
  const href = `/api/ecom/orders/labels-merged?ids=${selectedIds.join(",")}`;
  return (
    <a
      href={href}
      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-[#16202E] text-[#16202E] hover:bg-gray-50 transition-colors"
    >
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
        <path d="M4 6V2.5h8V6M4 12h8v2H4v-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2.5 6h11a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H12v-2H4v2H2.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      Print Labels ({selectedIds.length})
    </a>
  );
}
