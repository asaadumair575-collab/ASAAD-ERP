import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { userLabel } from "@/lib/userLabel";

function RiskBadge({ level }: { level: "HIGH" | "MEDIUM" | "LOW" }) {
  const styles = {
    HIGH:   "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[level]}`}>
      {level} RISK
    </span>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const me = await getSessionUser();
  if (!me?.isAdmin) notFound();

  const sp = await searchParams;

  // Get campaigns pending audit (or all if admin wants to review)
  const campaigns = await prisma.reorderCampaign.findMany({
    where: { sentForAudit: true },
    orderBy: { auditRequestedAt: "desc" },
    include: {
      createdBy: { select: { displayName: true, username: true, isAdmin: true } },
      _count: { select: { leads: true } },
    },
  });

  const selectedId = sp.campaign ? parseInt(sp.campaign) : campaigns[0]?.id;
  const selected = campaigns.find((c) => c.id === selectedId);

  // Fetch all call logs for selected campaign
  type FlaggedLog = {
    id: number;
    calledAt: Date;
    status: string;
    callNote: string | null;
    openCount: number;
    calledById: number;
    callerName: string;
    customerName: string;
    flags: string[];
  };

  let empStats: {
    userId: number;
    name: string;
    totalCalls: number;
    zeroOpenCount: number;       // never opened lead before logging
    rapidFire: number;           // < 30s after previous call
    noAnswerRate: number;        // % of calls that are NO_ANSWER
    identicalNotes: number;      // duplicate call notes
    riskScore: number;
    flaggedLogs: FlaggedLog[];
  }[] = [];

  if (selected) {
    const logs = await prisma.reorderCallLog.findMany({
      where: { lead: { campaignId: selected.id } },
      include: { lead: { select: { customerName: true } } },
      orderBy: [{ calledById: "asc" }, { calledAt: "asc" }],
    });

    // Group by employee
    const byEmp = new Map<number, typeof logs>();
    for (const log of logs) {
      const arr = byEmp.get(log.calledById) ?? [];
      arr.push(log);
      byEmp.set(log.calledById, arr);
    }

    // Fetch user names
    const userIds = Array.from(byEmp.keys());
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, userLabel(u)]));

    for (const [uid, empLogs] of byEmp) {
      const flaggedLogs: FlaggedLog[] = [];

      // Build note frequency map
      const noteFreq = new Map<string, number>();
      for (const l of empLogs) {
        if (l.callNote && l.callNote.trim()) {
          const n = l.callNote.trim().toLowerCase();
          noteFreq.set(n, (noteFreq.get(n) ?? 0) + 1);
        }
      }

      let zeroOpenCount = 0;
      let rapidFire = 0;
      let noAnswerCount = 0;
      let identicalNotes = 0;

      for (let i = 0; i < empLogs.length; i++) {
        const log = empLogs[i];
        const flags: string[] = [];

        // Flag: never opened lead (openCount = 0)
        if (log.openCount === 0) {
          flags.push("Never opened lead before logging");
          zeroOpenCount++;
        }

        // Flag: rapid fire (< 30s from previous call)
        if (i > 0) {
          const prev = empLogs[i - 1];
          const gapMs = log.calledAt.getTime() - prev.calledAt.getTime();
          if (gapMs < 30_000) {
            flags.push(`Only ${Math.round(gapMs / 1000)}s after previous call`);
            rapidFire++;
          }
        }

        // Flag: NO_ANSWER (not suspicious alone, just tracked)
        if (log.status === "NO_ANSWER") noAnswerCount++;

        // Flag: duplicate note
        if (log.callNote && log.callNote.trim()) {
          const freq = noteFreq.get(log.callNote.trim().toLowerCase()) ?? 1;
          if (freq > 2) {
            flags.push(`Note repeated ${freq} times`);
            identicalNotes++;
          }
        }

        if (flags.length > 0) {
          flaggedLogs.push({
            id: log.id,
            calledAt: log.calledAt,
            status: log.status,
            callNote: log.callNote,
            openCount: log.openCount,
            calledById: uid,
            callerName: userMap.get(uid) ?? "Unknown",
            customerName: log.lead.customerName,
            flags,
          });
        }
      }

      const noAnswerRate = empLogs.length > 0 ? Math.round((noAnswerCount / empLogs.length) * 100) : 0;

      // Risk score: weighted sum of suspicious indicators
      const riskScore = Math.min(100,
        zeroOpenCount * 8 +
        rapidFire * 12 +
        (noAnswerRate > 70 ? (noAnswerRate - 70) * 2 : 0) +
        identicalNotes * 5
      );

      empStats.push({
        userId: uid,
        name: userMap.get(uid) ?? "Unknown",
        totalCalls: empLogs.length,
        zeroOpenCount,
        rapidFire,
        noAnswerRate,
        identicalNotes,
        riskScore,
        flaggedLogs,
      });
    }

    // Sort by risk score descending
    empStats.sort((a, b) => b.riskScore - a.riskScore);
  }

  function formatTime(d: Date) {
    return d.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function riskLevel(score: number): "HIGH" | "MEDIUM" | "LOW" {
    return score >= 50 ? "HIGH" : score >= 20 ? "MEDIUM" : "LOW";
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/reorder" className="text-xs text-gray-400 hover:text-gray-600">← Campaigns</Link>
          <h1 className="text-xl font-semibold tracking-tight mt-1">Campaign Audit</h1>
          <p className="text-xs text-gray-400 mt-0.5">Detect fake or suspicious call activity</p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-gray-500 font-medium">No campaigns sent for audit yet</p>
          <p className="text-xs text-gray-400 mt-1">When employees complete a campaign and submit it, it appears here</p>
        </div>
      ) : (
        <>
          {/* Campaign selector */}
          {campaigns.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/reorder/audit?campaign=${c.id}`}
                  className={`text-sm px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                    c.id === selectedId
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          {/* Campaign info */}
          {selected && (
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selected._count.leads} leads · Submitted{" "}
                  {selected.auditRequestedAt
                    ? new Date(selected.auditRequestedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long" })
                    : ""}
                  {selected.createdBy && ` by ${userLabel(selected.createdBy)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {empStats.reduce((s, e) => s + e.flaggedLogs.length, 0)}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Suspicious Entries</p>
              </div>
            </div>
          )}

          {/* Per-employee audit cards */}
          {empStats.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
              <p className="text-green-600 text-lg font-bold">✓ All Clear</p>
              <p className="text-sm text-gray-400 mt-1">No suspicious patterns detected</p>
            </div>
          )}

          <div className="space-y-4">
            {empStats.map((emp) => {
              const level = riskLevel(emp.riskScore);
              return (
                <div key={emp.userId} className={`bg-white border-2 rounded-2xl shadow-sm overflow-hidden ${
                  level === "HIGH" ? "border-red-200" : level === "MEDIUM" ? "border-amber-200" : "border-gray-200"
                }`}>
                  {/* Employee header */}
                  <div className="px-5 py-4 flex items-center gap-4 border-b border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <RiskBadge level={level} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{emp.totalCalls} total calls logged</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${level === "HIGH" ? "text-red-600" : level === "MEDIUM" ? "text-amber-600" : "text-yellow-600"}`}>
                        {emp.riskScore}
                      </p>
                      <p className="text-[10px] text-gray-400">risk score</p>
                    </div>
                  </div>

                  {/* Indicators grid */}
                  <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
                    {[
                      {
                        label: "Never Opened",
                        value: emp.zeroOpenCount,
                        sub: "logged without viewing",
                        alert: emp.zeroOpenCount > 0,
                      },
                      {
                        label: "Rapid Fire",
                        value: emp.rapidFire,
                        sub: "calls < 30s apart",
                        alert: emp.rapidFire > 0,
                      },
                      {
                        label: "No Answer Rate",
                        value: `${emp.noAnswerRate}%`,
                        sub: "of total calls",
                        alert: emp.noAnswerRate > 70,
                      },
                      {
                        label: "Repeated Notes",
                        value: emp.identicalNotes,
                        sub: "copy-pasted notes",
                        alert: emp.identicalNotes > 0,
                      },
                    ].map((s) => (
                      <div key={s.label} className={`px-4 py-3 text-center ${s.alert ? "bg-red-50/50" : ""}`}>
                        <p className={`text-xl font-bold ${s.alert ? "text-red-600" : "text-gray-500"}`}>{s.value}</p>
                        <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{s.label}</p>
                        <p className="text-[10px] text-gray-400">{s.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Flagged log entries */}
                  {emp.flaggedLogs.length > 0 && (
                    <div className="px-5 py-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Flagged Entries ({emp.flaggedLogs.length})
                      </p>
                      <div className="space-y-2">
                        {emp.flaggedLogs.map((log) => (
                          <div key={log.id} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-gray-800">{log.customerName}</span>
                                <span className="text-[10px] text-gray-400">{formatTime(log.calledAt)}</span>
                                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                  {log.status.replace(/_/g, " ")}
                                </span>
                                {log.openCount === 0 && (
                                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                                    openCount=0
                                  </span>
                                )}
                              </div>
                              {log.callNote && (
                                <p className="text-[11px] text-gray-500 mt-0.5 truncate">&ldquo;{log.callNote}&rdquo;</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {log.flags.map((f, fi) => (
                                  <span key={fi} className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                    ⚠ {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {emp.flaggedLogs.length === 0 && (
                    <div className="px-5 py-3 text-xs text-green-600 flex items-center gap-1.5">
                      <span>✓</span> No flagged entries for this employee
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
