import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QueueCard, EmptyQueue } from "./QueueClient";

export default async function CallingQueuePage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  // Current assignment for this employee
  const assigned = await prisma.callingLead.findFirst({
    where: { assignedToId: me.id, queueStatus: "ASSIGNED" },
    include: {
      callRecords: {
        orderBy: { calledAt: "desc" },
        include: { calledBy: { select: { displayName: true, username: true } } },
      },
    },
  });

  // Count available leads (for the empty state message)
  const now = new Date();
  const pendingCount = await prisma.callingLead.count({
    where: {
      assignedToId: null,
      queueStatus: {
        in: assigned ? [] : ["PENDING", "FOLLOW_UP", "NO_ANSWER_RETRY"],
      },
      OR: [
        { queueStatus: "PENDING" },
        { queueStatus: "FOLLOW_UP",       followUpAt:   { lte: now } },
        { queueStatus: "NO_ANSWER_RETRY", nextRetryAt:  { lte: now } },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {me.isAdmin && (
            <Link href="/calling/dashboard" className="text-sm text-gray-400 hover:text-gray-700">← Dashboard</Link>
          )}
          <h1 className="text-sm font-bold text-gray-900">📞 Call Queue</h1>
        </div>
        <div className="flex items-center gap-2">
          {me.isAdmin && (
            <Link href="/calling/settings" className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
              Settings
            </Link>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-1.5">
            {me.displayName ?? me.username}
          </span>
        </div>
      </div>

      {assigned ? (
        <QueueCard lead={assigned} />
      ) : (
        <EmptyQueue pendingCount={pendingCount} />
      )}
    </div>
  );
}
