import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReorderUploadModal from "./ReorderUploadModal";
import DeleteCampaignButton from "./DeleteCampaignButton";

export default async function ReorderPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [campaigns, todayLeads] = await Promise.all([
    prisma.reorderCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { displayName: true, username: true } },
        _count: { select: { leads: true } },
        leads: { select: { status: true } },
      },
    }),
    prisma.reorderLead.findMany({
      where: { calledAt: { gte: todayStart } },
      select: {
        status: true,
        calledBy: { select: { id: true, displayName: true, username: true } },
      },
    }),
  ]);

  // Group today's calls by employee
  const empMap = new Map<number, { name: string; total: number; ordered: number; notInterested: number; noAnswer: number; callback: number }>();
  for (const l of todayLeads) {
    if (!l.calledBy) continue;
    const id = l.calledBy.id;
    const name = l.calledBy.displayName ?? l.calledBy.username;
    const existing = empMap.get(id) ?? { name, total: 0, ordered: 0, notInterested: 0, noAnswer: 0, callback: 0 };
    existing.total++;
    if (l.status === "ORDER_PLACED")   existing.ordered++;
    if (l.status === "NOT_INTERESTED") existing.notInterested++;
    if (l.status === "NO_ANSWER")      existing.noAnswer++;
    if (l.status === "CALLBACK")       existing.callback++;
    empMap.set(id, existing);
  }
  const todayStats = Array.from(empMap.values()).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reorder Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">Upload delivered-parcel CSVs and track re-order calls</p>
        </div>
        <ReorderUploadModal />
      </div>

      {/* Today's call activity */}
      {todayStats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Aaj ki Calls</p>
          <div className="space-y-2">
            {todayStats.map((e) => (
              <div key={e.name} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-zinc-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {e.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.name}</p>
                    <p className="text-sm font-bold text-gray-900 shrink-0 ml-2">{e.total} calls</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {e.ordered > 0      && <span className="text-green-600 font-medium">✅ {e.ordered} orders</span>}
                    {e.callback > 0     && <span className="text-blue-600">🔁 {e.callback}</span>}
                    {e.noAnswer > 0     && <span className="text-yellow-600">📵 {e.noAnswer}</span>}
                    {e.notInterested > 0 && <span className="text-red-500">❌ {e.notInterested}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-4xl mb-3">📞</p>
          <p className="text-sm font-medium text-gray-500">No campaigns yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a delivered-parcels CSV to start</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const total = c.leads.length;
            const called = c.leads.filter((l) => l.status !== "PENDING").length;
            const ordered = c.leads.filter((l) => l.status === "ORDER_PLACED").length;
            const pending = c.leads.filter((l) => l.status === "PENDING").length;
            const pct = total > 0 ? Math.round((called / total) * 100) : 0;

            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/reorder/${c.id}`} className="text-base font-semibold text-gray-900 hover:text-black truncate block">
                      {c.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      {c.createdBy && ` · by ${c.createdBy.displayName ?? c.createdBy.username}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/reorder/${c.id}`}
                      className="text-xs bg-black text-white font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      View Leads
                    </Link>
                    {me.isAdmin && <DeleteCampaignButton id={c.id} />}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: total, color: "text-gray-700" },
                    { label: "Pending", value: pending, color: "text-amber-600" },
                    { label: "Called", value: called, color: "text-blue-600" },
                    { label: "Orders", value: ordered, color: "text-green-600" },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Call progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
