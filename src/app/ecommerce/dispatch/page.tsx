import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dispatchSheetNumber } from "@/lib/dispatchSheetNumber";
import ScanDispatchModal from "@/components/ScanDispatchModal";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function DispatchListPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const sheets = await prisma.dispatchSheet.findMany({
    include: { createdBy: { select: { displayName: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Saved dispatch sheets — generated from Orders, reprintable anytime.
          </p>
        </div>
        <ScanDispatchModal />
      </div>

      {sheets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-gray-400"><rect x="2" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <p className="text-base font-semibold text-gray-700">No dispatch sheets yet</p>
          <p className="text-sm text-gray-400 mt-1">Select packed orders on Orders and generate one.</p>
          <Link href="/ecommerce/orders" className="inline-block mt-4 text-sm font-medium text-[#16202E] underline decoration-dotted">
            Go to Orders →
          </Link>
        </div>
      ) : (
        <>
        {/* Mobile card list */}
        <div className="sm:hidden space-y-2">
          {sheets.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/ecommerce/dispatch/${s.id}`} className="font-mono text-xs font-semibold text-[#16202E] hover:underline">{dispatchSheetNumber(s.id)}</Link>
                <span className="text-xs text-gray-400">
                  {s.date.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-700">
                <span>{s.totalParcels} parcels</span>
                <span className="tabular-nums">Rs {fmt(s.totalValue)}</span>
                <span className="tabular-nums">{s.totalWeight > 0 ? `${s.totalWeight.toFixed(2)} kg` : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                {s.dispatchedAt ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Dispatched{s.finalWeight != null ? ` · ${s.finalWeight.toFixed(2)} kg` : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    Pending
                  </span>
                )}
                <Link
                  href={`/ecommerce/dispatch/sheet?sheetId=${s.id}&print=1`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[#16202E] text-[#BFD732] hover:bg-[#232F42] transition-colors"
                >
                  Print
                </Link>
              </div>
              <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                {s.createdAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
                {s.createdBy && <span className="block">{s.createdBy.displayName ?? s.createdBy.username}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium text-left">
                <th className="py-2.5 px-4">Sheet #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Parcels</th>
                <th className="py-2.5 px-3">Total Value</th>
                <th className="py-2.5 px-3">Total Weight</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Generated</th>
                <th className="py-2.5 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sheets.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-[#16202E]">
                    <Link href={`/ecommerce/dispatch/${s.id}`} className="hover:underline">{dispatchSheetNumber(s.id)}</Link>
                  </td>
                  <td className="py-3 px-3 font-semibold text-gray-900">
                    {s.date.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-gray-700">{s.totalParcels}</td>
                  <td className="py-3 px-3 tabular-nums text-gray-700">Rs {fmt(s.totalValue)}</td>
                  <td className="py-3 px-3 tabular-nums text-gray-700">{s.totalWeight > 0 ? `${s.totalWeight.toFixed(2)} kg` : "—"}</td>
                  <td className="py-3 px-3">
                    {s.dispatchedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Dispatched{s.finalWeight != null ? ` · ${s.finalWeight.toFixed(2)} kg` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-400">
                    {s.createdAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
                    {s.createdBy && <span className="block">{s.createdBy.displayName ?? s.createdBy.username}</span>}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Link
                      href={`/ecommerce/dispatch/sheet?sheetId=${s.id}&print=1`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#16202E] text-[#BFD732] hover:bg-[#232F42] transition-colors"
                    >
                      Print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
