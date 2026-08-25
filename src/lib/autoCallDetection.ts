import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Matches phone numbers written in different formats (+923001234567,
// 03001234567, 3001234567, with spaces/dashes) by comparing the last 10
// digits — good enough for Pakistani mobile numbers.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

// Called right after a phone call syncs in from the Employee Call app. If
// the call was to a lead the employee has an open "Show Number" attempt on
// and it didn't connect, log the outcome automatically — the employee no
// longer has to tap "Not Picked" themselves, since the phone's own call log
// already proves it.
export async function autoDetectCallOutcome(params: {
  userId: number;
  phoneNumber: string;
  duration: number;
  callType: string;
}) {
  const { userId, phoneNumber, duration, callType } = params;

  const connected = callType === "OUTGOING" && duration > 0;
  if (connected || callType === "INCOMING") return;

  const target = normalizePhone(phoneNumber);
  if (!target) return;

  const attempts = await prisma.reorderCallAttempt.findMany({
    where: { userId },
    orderBy: { openedAt: "desc" },
    include: { lead: { select: { id: true, phone: true, status: true } } },
  });
  const match = attempts.find((a) => normalizePhone(a.lead.phone) === target);
  if (!match) return;

  const leadId = match.leadId;
  const now = new Date();

  const leadAttempts = attempts.filter((a) => a.leadId === leadId);
  const openCount = leadAttempts.length;
  const attemptedAt = leadAttempts[leadAttempts.length - 1].openedAt;
  await prisma.reorderCallAttempt.deleteMany({
    where: { id: { in: leadAttempts.map((a) => a.id) } },
  });

  const note = callType === "MISSED" ? "Number closed / call not picked (auto-detected from phone)" : "Call not picked (auto-detected from phone)";

  await prisma.$transaction([
    prisma.reorderLead.update({
      where: { id: leadId },
      data: { status: "NO_ANSWER", callNote: note, calledAt: now, calledById: userId, followUpDate: null },
    }),
    prisma.reorderCallLog.create({
      data: { leadId, status: "NO_ANSWER", callNote: note, calledAt: now, calledById: userId, attemptedAt, openCount },
    }),
  ]);

  revalidatePath("/reorder");
}
