import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AirwayBillsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">PostEx Airway Bills</h1>
        <p className="text-sm text-gray-400 mt-0.5">Download the label / airway bill PDF for a day's dispatched parcels</p>
      </div>

      <form
        action="/api/ecom/postex-airway-bills"
        method="GET"
        target="_blank"
        className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3"
      >
        <input
          type="date"
          name="date"
          defaultValue={todayPK}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#BFD732] focus:border-transparent"
        />
        <button
          type="submit"
          className="ml-auto bg-white border border-[#16202E] text-[#16202E] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <path d="M10 3v10m0 0 3.5-3.5M10 13l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15.5v.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Download Airway Bills
        </button>
      </form>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-xs text-amber-800">
        This calls PostEx&apos;s label endpoint for every parcel dispatched on the selected date. If your account uses
        a different response format than expected, the download will show an error message instead of a broken
        file — send that message over and it can be fixed the same way the tracking sync was.
      </div>
    </div>
  );
}
