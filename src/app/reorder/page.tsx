import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReorderUploadModal from "./ReorderUploadModal";
import DeleteCampaignButton from "./DeleteCampaignButton";
import LeadSearch from "./LeadSearch";
import { userLabel } from "@/lib/userLabel";
import { toggleReorderCampaignActive, sendCampaignForAudit, undoCampaignAudit, returnCampaignFromAudit } from "@/lib/actions";

export default async function ReorderPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = (tab === "inactive" || tab === "completed") ? tab : "active";

  const allCampaigns = await prisma.reorderCampaign.findMany({
    where: me.isAdmin ? undefined : { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { displayName: true, username: true, isAdmin: true } },
      _count: { select: { leads: true } },
      leads: { select: { status: true, _count: { select: { callLogs: true } } } },
      auditLogs: { orderBy: { sentAt: "asc" } },
    },
  });

  const active    = allCampaigns.filter((c) => c.isActive && !isCompleted(c));
  const completed = allCampaigns.filter((c) => isCompleted(c));
  const inactive  = allCampaigns.filter((c) => !c.isActive && !isCompleted(c));

  const campaigns = activeTab === "active" ? active : activeTab === "completed" ? completed : inactive;

  function isCompleted(c: typeof allCampaigns[0]) {
    const total = c.leads.length;
    const called = c.leads.filter((l) => l.status !== "PENDING").length;
    return total > 0 && called === total;
  }

  const tabs = [
    { key: "active",    label: "Active",      count: active.length    },
    { key: "completed", label: "Completed",   count: completed.length },
    { key: "inactive",  label: "Not Active",  count: inactive.length  },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reorder Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">Upload delivered-parcel CSVs and track re-order calls</p>
        </div>
        <div className="flex items-center gap-2">
          <LeadSearch />
          <Link
            href="/reorder/retail-followup"
            className="border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
          >
            🔄 Retail Follow-up
          </Link>
          <ReorderUploadModal />
          {me.isAdmin && (
            <Link
              href="/reorder/audit"
              className="border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors shrink-0"
            >
              🔍 Audit
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "active" ? "/reorder" : `/reorder?tab=${t.key}`}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                activeTab === t.key ? "bg-black text-white" : "bg-gray-300 text-gray-600"
              }`}>
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-4xl mb-3">📞</p>
          <p className="text-sm font-medium text-gray-500">
            {activeTab === "active" ? "No active campaigns" : activeTab === "completed" ? "No completed campaigns yet" : "No inactive campaigns"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === "active" ? "Upload a delivered-parcels CSV to start" : activeTab === "completed" ? "Campaigns where all leads are called will appear here" : "All campaigns are currently active"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const total           = c.leads.length;
            const noAnswer        = c.leads.filter((l) => l.status === "NO_ANSWER").length;
            const notInterested   = c.leads.filter((l) => l.status === "NOT_INTERESTED").length;
            const interestedLater = c.leads.filter((l) => l.status === "INTERESTED_LATER").length;
            const totalCallLogs   = c.leads.reduce((s, l) => s + l._count.callLogs, 0);
            const calledLeads     = c.leads.filter((l) => l.status !== "PENDING").length;
            const pct             = total > 0 ? Math.round((calledLeads / total) * 100) : 0;
            const campaignDone    = isCompleted(c);

            // Under review = sent for audit, not returned yet
            const underReview = c.sentForAudit && !c.auditReturnedAt;
            // Has feedback from admin (returned with notes)
            const hasFeedback = !!c.auditFeedback && !!c.auditReturnedAt;

            const toggleActive  = toggleReorderCampaignActive.bind(null, c.id, !c.isActive);
            const auditAction   = sendCampaignForAudit.bind(null, c.id);
            const undoAudit     = undoCampaignAudit.bind(null, c.id);
            const returnAction  = returnCampaignFromAudit.bind(null, c.id);

            return (
              <div key={c.id} className={`bg-white border rounded-2xl shadow-sm p-5 relative overflow-hidden ${
                underReview ? "border-purple-200" : hasFeedback ? "border-orange-200" : campaignDone ? "border-green-300" : "border-gray-200"
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Employee can't open if under review */}
                      {(!underReview || me.isAdmin) ? (
                        <Link href={`/reorder/${c.id}`} className="text-base font-semibold text-gray-900 hover:text-black truncate">
                          {c.name}
                        </Link>
                      ) : (
                        <span className="text-base font-semibold text-gray-400 truncate">{c.name}</span>
                      )}
                      {campaignDone && (
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded-full shrink-0">✓ Completed</span>
                      )}
                      {underReview && (
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-300 px-2 py-0.5 rounded-full shrink-0">🔍 Review Under Process</span>
                      )}
                      {hasFeedback && !c.sentForAudit && (
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 rounded-full shrink-0">⚠ Returned — Action Needed</span>
                      )}
                      {c.isRetailFollowup && (
                        <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">Retail</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      {c.createdBy && ` · by ${userLabel(c.createdBy)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(!underReview || me.isAdmin) && (
                      <Link
                        href={`/reorder/${c.id}`}
                        className="text-xs bg-black text-white font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        View Leads
                      </Link>
                    )}
                    {me.isAdmin && (
                      <form action={toggleActive}>
                        <button
                          type="submit"
                          title={c.isActive ? "Pause campaign" : "Activate campaign"}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                            c.isActive
                              ? "border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                          }`}
                        >
                          {c.isActive ? "⏸ Pause" : "▶ Activate"}
                        </button>
                      </form>
                    )}
                    {me.isAdmin && <DeleteCampaignButton id={c.id} />}
                  </div>
                </div>

                {/* Admin feedback returned to employee */}
                {hasFeedback && !c.sentForAudit && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-orange-700">Admin Feedback:</p>
                    <p className="text-sm text-orange-800">{c.auditFeedback}</p>
                    <p className="text-[11px] text-orange-400">
                      Returned {c.auditReturnedAt ? new Date(c.auditReturnedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : ""}
                    </p>
                  </div>
                )}

                {/* Admin: return from audit form */}
                {me.isAdmin && underReview && (
                  <form action={returnAction} className="mt-3 space-y-2">
                    <textarea
                      name="feedback"
                      rows={2}
                      placeholder="Feedback for employee (e.g. Too many No Answer calls — review and retry)"
                      className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    />
                    <button
                      type="submit"
                      className="w-full text-xs font-semibold bg-orange-50 border border-orange-300 text-orange-700 py-2 rounded-xl hover:bg-orange-100 transition-colors"
                    >
                      ↩ Return to Employee with Feedback
                    </button>
                  </form>
                )}

                {/* Employee: send for audit / under review / re-send */}
                {!me.isAdmin && campaignDone && (
                  <>
                    {underReview ? (
                      <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5">
                        <p className="text-xs text-purple-700 font-semibold">Review Under Process</p>
                        <p className="text-[11px] text-purple-400 mt-0.5">
                          Submitted {c.auditRequestedAt ? new Date(c.auditRequestedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : ""}
                          {" · "}
                          <form action={undoAudit} className="inline">
                            <button type="submit" className="underline underline-offset-2 text-purple-500 hover:text-purple-700">Undo</button>
                          </form>
                        </p>
                      </div>
                    ) : (
                      <form action={auditAction} className="mt-3">
                        <button
                          type="submit"
                          className="w-full text-xs font-semibold bg-green-50 border border-green-300 text-green-700 py-2 rounded-xl hover:bg-green-100 transition-colors"
                        >
                          📋 Send to Admin for Audit
                        </button>
                      </form>
                    )}
                  </>
                )}

                {/* Audit history (admin only) */}
                {me.isAdmin && c.auditLogs.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Audit History</p>
                    {c.auditLogs.map((log, i) => {
                      const stats = log.roundStats as { totalCalls: number; statuses: Record<string, number> } | null;
                      return (
                        <div key={log.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">Round {i + 1}</span>
                            <span className="text-[11px] text-gray-400">
                              Sent {new Date(log.sentAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                              {log.returnedAt && <> · Returned {new Date(log.returnedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</>}
                            </span>
                          </div>
                          {stats && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-gray-600">
                                {stats.totalCalls} calls in this round
                              </span>
                              {Object.entries(stats.statuses).map(([s, count]) => (
                                <span key={s} className="text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-gray-500">
                                  {s.replace(/_/g, " ")}: {count}
                                </span>
                              ))}
                            </div>
                          )}
                          {log.feedback && (
                            <p className="text-[11px] text-orange-600 italic border-t border-orange-100 pt-1.5">
                              Feedback: {log.feedback}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {[
                    { label: "Total",         value: total,           color: "text-gray-700"   },
                    { label: "No Answer",     value: noAnswer,        color: "text-yellow-600" },
                    { label: "Not Interested",value: notInterested,   color: "text-red-500"    },
                    { label: "Int. Later",    value: interestedLater, color: "text-orange-500" },
                    { label: "Calls Made",    value: totalCallLogs,   color: "text-blue-600"   },
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
