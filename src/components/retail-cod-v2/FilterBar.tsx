import { Search } from "lucide-react";

export default function FilterBar({ basePath, q, from, to }: { basePath: string; q?: string; from?: string; to?: string }) {
  return (
    <form method="GET" className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search customer, phone, city..."
          className="w-full bg-gray-50 border border-transparent rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
        />
      </div>
      <input type="date" name="from" defaultValue={from ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      <span className="text-xs text-gray-400 hidden sm:inline">to</span>
      <input type="date" name="to" defaultValue={to ?? ""} className="bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      <button type="submit" className="bg-[#16202E] text-[#BFD732] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#232F42] transition-colors">
        Filter
      </button>
      {(q || from || to) && (
        <a href={basePath} className="text-sm text-gray-400 hover:text-black transition-colors px-1">Clear</a>
      )}
    </form>
  );
}
