import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dispatchSheetNumber } from "@/lib/dispatchSheetNumber";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

type Row = { id: number; orderLabel: string; customerName: string; trackingNumber: string | null; weight: number | null; totalAmount: number };

export default async function DispatchSheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { id } = await params;
  const sheet = await prisma.dispatchSheet.findUnique({
    where: { id: Number(id) },
    include: {
      createdBy: { select: { displayName: true, username: true } },
      dispatchedBy: { select: { displayName: true, username: true } },
    },
  });
  if (!sheet) notFound();

  const rows = sheet.snapshot as unknown as Row[];
  const dateLabel = sheet.date.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/ecommerce/dispatch" className="text-sm text-gray-400 hover:text-black">← Dispatch</Link>
        <div className="flex items-start justify-between gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight font-mono">{dispatchSheetNumber(sheet.id)}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
          </div>
          {sheet.dispatchedAt ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 shrink-0">Dispatched</span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 shrink-0">Pending</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Parcels</p>
          <p className="text-2xl font-bold tabular-nums text-[#16202E] mt-1">{sheet.totalParcels}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Value</p>
          <p className="text-2xl font-bold tabular-nums text-[#16202E] mt-1">Rs {fmt(sheet.totalValue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Weight</p>
          <p className="text-2xl font-bold tabular-nums text-[#16202E] mt-1">{sheet.totalWeight > 0 ? `${sheet.totalWeight.toFixed(2)} kg` : "—"}</p>
        </div>
      </div>

      {/* Dispatch (gate verification) details */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gate Verification</p>
        </div>
        {sheet.dispatchedAt ? (
          <div className="p-5 space-y-4">
            {sheet.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sheet.photo} alt="Scale at dispatch" className="w-full max-h-72 object-cover rounded-xl border border-gray-100" />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Dispatched by</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {sheet.dispatchedBy?.displayName ?? sheet.dispatchedBy?.username ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Dispatched at</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {sheet.dispatchedAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Scanned weight</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{sheet.finalWeight != null ? `${sheet.finalWeight.toFixed(2)} kg` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Expected weight</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{sheet.totalWeight > 0 ? `${sheet.totalWeight.toFixed(2)} kg` : "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <p className="text-sm text-gray-400">Not dispatched yet — scan this sheet&apos;s QR with Scan &amp; Dispatch to weigh and dispatch it.</p>
          </div>
        )}
      </div>

      {/* Parcels */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Parcels ({rows.length})</p>
        </div>
        <div className="divide-y divide-gray-50">
          {rows.map((r) => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.orderLabel} — {r.customerName}</p>
                <p className="text-xs text-gray-400 font-mono">{r.trackingNumber ?? "—"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-gray-700 tabular-nums">Rs {fmt(r.totalAmount)}</p>
                {r.weight != null && <p className="text-xs text-gray-400 tabular-nums">{r.weight.toFixed(2)} kg</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-6">
        <Link
          href={`/ecommerce/dispatch/sheet?sheetId=${sheet.id}&print=1`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-[#16202E] text-[#BFD732] hover:bg-[#232F42] transition-colors"
        >
          Print Sheet
        </Link>
      </div>
    </div>
  );
}
