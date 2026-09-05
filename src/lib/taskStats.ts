import { prisma } from "@/lib/prisma";

export type LiveTaskStats = { remaining: number; doneToday: number; remainingLabel: string };

// Shared between /work (always "today") and /performance (any selected day)
// so both read live off the same source tables instead of duplicating the
// per-metric queries.
export async function getLiveTaskStats(
  metric: string | null,
  assignedToId: number,
  targetValue: number,
  dayStart: Date,
  dayEnd: Date
): Promise<LiveTaskStats> {
  if (metric === "CONFIRM_ORDERS") {
    const [remaining, doneToday] = await Promise.all([
      prisma.ecomOrder.count({ where: { draft: true } }),
      prisma.ecomOrder.count({ where: { confirmedAt: { gte: dayStart, lte: dayEnd } } }),
    ]);
    return { remaining, doneToday, remainingLabel: "Remaining orders" };
  }
  if (metric === "REORDER_CALLS") {
    const doneToday = await prisma.reorderCallLog.count({
      where: { calledById: assignedToId, calledAt: { gte: dayStart, lte: dayEnd } },
    });
    return { remaining: Math.max(targetValue - doneToday, 0), doneToday, remainingLabel: `Left of ${targetValue}` };
  }
  if (metric === "LEAD_CALLS") {
    const doneToday = await prisma.lead.count({
      where: { contactedById: assignedToId, contactedAt: { gte: dayStart, lte: dayEnd } },
    });
    return { remaining: Math.max(targetValue - doneToday, 0), doneToday, remainingLabel: `Left of ${targetValue}` };
  }
  if (metric === "RETAIL_ORDERS") {
    const doneToday = await prisma.retailOrder.count({
      where: { createdByUserId: assignedToId, createdAt: { gte: dayStart, lte: dayEnd } },
    });
    return { remaining: Math.max(targetValue - doneToday, 0), doneToday, remainingLabel: `Left of ${targetValue}` };
  }
  return { remaining: 0, doneToday: 0, remainingLabel: "Remaining" };
}
