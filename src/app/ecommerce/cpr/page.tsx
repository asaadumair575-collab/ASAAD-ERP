import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CprImportForm from "@/components/CprImportForm";
import { prisma } from "@/lib/prisma";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function CprPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/ecommerce");

  const history = await prisma.cprBatch.findMany({ orderBy: { appliedAt: "desc" }, take: 30 });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CPR Settlement</h1>
        <p className="text-sm text-gray-500 mt-1">PostEx ka weekly CPR PDF upload karo — delivered orders pe payment record ho jayegi, returned orders automatically mark ho jayenge.</p>
      </div>
      <CprImportForm />

      {history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CPR History</p>
          </div>
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-50">
            {history.map((b) => (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{b.appliedAt.toISOString().slice(0, 10)}</span>
                  <span className="text-sm font-medium text-green-700 tabular-nums">Rs {fmt(b.totalSettled)}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-gray-400">{b.fileCount} files</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{b.payments} settled</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{b.returned} returned</span>
                  {b.notFound > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{b.notFound} not found</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
                <th className="py-2 px-5">Date</th>
                <th className="py-2 px-5 text-center">Files</th>
                <th className="py-2 px-5 text-center">Settled</th>
                <th className="py-2 px-5 text-center">Returned</th>
                <th className="py-2 px-5 text-center">Not Found</th>
                <th className="py-2 px-5 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((b) => (
                <tr key={b.id}>
                  <td className="py-3 px-5 text-gray-600 text-xs">{b.appliedAt.toISOString().slice(0, 10)}</td>
                  <td className="py-3 px-5 text-center text-gray-500">{b.fileCount}</td>
                  <td className="py-3 px-5 text-center">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{b.payments}</span>
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{b.returned}</span>
                  </td>
                  <td className="py-3 px-5 text-center">
                    {b.notFound > 0
                      ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{b.notFound}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-5 text-right tabular-nums font-medium text-green-700">Rs {fmt(b.totalSettled)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
