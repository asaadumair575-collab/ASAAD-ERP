import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  basePath,
  currentPage,
  totalPages,
  query,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  query: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <Link href={hrefFor(currentPage - 1)} className="inline-flex items-center gap-1 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Link>
        )}
        {currentPage < totalPages && (
          <Link href={hrefFor(currentPage + 1)} className="inline-flex items-center gap-1 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Next <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
