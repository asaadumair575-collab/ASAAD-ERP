import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import ComplaintCard from "./ComplaintCard";

export default async function ComplaintsPage() {
  const me = await getSessionUser();
  if (!me) notFound();

  const where = me.isAdmin ? undefined : { submittedById: me.id };

  const [complaints, allForStats] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { displayName: true, username: true } } },
    }),
    prisma.complaint.findMany({
      where,
      select: { status: true, createdAt: true },
    }),
  ]);

  const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  complaints.sort((a, b) => {
    const aOpen = a.status === "OPEN" || a.status === "IN_PROGRESS" ? 0 : 1;
    const bOpen = b.status === "OPEN" || b.status === "IN_PROGRESS" ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = allForStats.length;
  const open = allForStats.filter((c) => c.status === "OPEN").length;
  const inProgress = allForStats.filter((c) => c.status === "IN_PROGRESS").length;
  const resolved = allForStats.filter((c) => c.status === "RESOLVED").length;
  const thisMonth = allForStats.filter((c) => c.createdAt >= monthStart).length;

  const stats = [
    { label: "Total",       value: total,      color: "bg-gray-50  border-gray-200  text-gray-700" },
    { label: "Open",        value: open,        color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { label: "In Progress", value: inProgress,  color: "bg-blue-50  border-blue-200  text-blue-700" },
    { label: "Resolved",    value: resolved,    color: "bg-green-50 border-green-200 text-green-700" },
    { label: "This Month",  value: thisMonth,   color: "bg-purple-50 border-purple-200 text-purple-700" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {me.isAdmin ? "All employee complaints" : "Your submitted complaints"}
          </p>
        </div>
        <Link
          href="/complaints/new"
          className="text-sm font-medium bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Complaint
        </Link>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={`border rounded-xl px-3 py-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-[11px] font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {complaints.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No complaints yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <ComplaintCard key={c.id} c={c} isAdmin={me.isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
