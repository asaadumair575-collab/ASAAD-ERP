export default function GenerateDispatchListButton() {
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  return (
    <form action="/ecommerce/dispatch/sheet" method="GET" target="_blank" className="flex items-center gap-1.5">
      <input
        type="date"
        name="date"
        defaultValue={todayPK}
        className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
      />
      <input type="hidden" name="print" value="1" />
      <button
        type="submit"
        className="bg-white border border-[#16202E] text-[#16202E] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Dispatch List
      </button>
    </form>
  );
}
