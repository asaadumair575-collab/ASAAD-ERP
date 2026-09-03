import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dispatchSheetNumber } from "@/lib/dispatchSheetNumber";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Saved dispatch sheets — generated from Confirm Orders, reprintable anytime.
        </p>
      </div>

      {sheets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-gray-400"><rect x="2" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <p className="text-base font-semibold text-gray-700">No dispatch sheets yet</p>
          <p className="text-sm text-gray-400 mt-1">Select packed orders on Confirm Orders and generate one.</p>
          <Link href="/ecommerce/orders" className="inline-block mt-4 text-sm font-medium text-[#16202E] underline decoration-dotted">
            Go to Confirm Orders →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium text-left">
                <th className="py-2.5 px-4">Sheet #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Parcels</th>
                <th className="py-2.5 px-3">Total Value</th>
                <th className="py-2.5 px-3">Total Weight</th>
                <th className="py-2.5 px-3">Generated</th>
                <th className="py-2.5 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sheets.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-[#16202E]">{dispatchSheetNumber(s.id)}</td>
                  <td className="py-3 px-3 font-semibold text-gray-900">
                    {s.date.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 px-3 tabular-nums text-gray-700">{s.totalParcels}</td>
                  <td className="py-3 px-3 tabular-nums text-gray-700">Rs {fmt(s.totalValue)}</td>
                  <td className="py-3 px-3 tabular-nums text-gray-700">{s.totalWeight > 0 ? `${s.totalWeight.toFixed(2)} kg` : "—"}</td>
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
      )}
    </div>
  );
}
