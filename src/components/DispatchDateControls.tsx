export default function DispatchDateControls({ date, basePath }: { date: string; basePath: string }) {
  return (
    <form
      action={basePath}
      method="GET"
      className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 print:hidden"
    >
      <input
        type="date"
        name="date"
        defaultValue={date}
        className="border border-gray-200 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent w-full sm:w-auto"
      />
      <input type="hidden" name="print" value="1" />
      <button
        type="submit"
        className="bg-white border border-[#16202E] text-[#16202E] text-sm font-semibold px-5 py-2.5 sm:py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Generate Dispatch Report
      </button>
    </form>
  );
}
