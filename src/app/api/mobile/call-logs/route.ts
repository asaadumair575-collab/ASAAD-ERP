import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoDetectCallOutcome } from "@/lib/autoCallDetection";

const VALID_CALL_TYPES = new Set(["INCOMING", "OUTGOING", "MISSED"]);

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// Reported by the Employee Call Android app after every phone call, straight
// from the device's own CallLog — this is the real duration/outcome, not
// anything the employee could type in.
export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing API token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { apiToken: token } });
  if (!user) {
    return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { phoneNumber, contactName, duration, callType, calledAt, ringDuration } = body ?? {};

  if (
    typeof phoneNumber !== "string" ||
    !phoneNumber ||
    typeof duration !== "number" ||
    typeof callType !== "string" ||
    typeof calledAt !== "string"
  ) {
    return NextResponse.json({ error: "Invalid call log payload" }, { status: 400 });
  }

  const ringDurationValue = typeof ringDuration === "number" ? ringDuration : 0;

  if (!VALID_CALL_TYPES.has(callType)) {
    return NextResponse.json({ error: "Invalid callType" }, { status: 400 });
  }

  const calledAtDate = new Date(calledAt);
  if (Number.isNaN(calledAtDate.getTime())) {
    return NextResponse.json({ error: "Invalid calledAt" }, { status: 400 });
  }

  const log = await prisma.phoneCallLog.upsert({
    where: {
      userId_phoneNumber_calledAt: {
        userId: user.id,
        phoneNumber,
        calledAt: calledAtDate,
      },
    },
    create: {
      userId: user.id,
      phoneNumber,
      contactName: contactName || null,
      duration,
      ringDuration: ringDurationValue,
      callType,
      calledAt: calledAtDate,
      synced: true,
    },
    update: {
      contactName: contactName || null,
      duration,
      ringDuration: ringDurationValue,
      callType,
      synced: true,
    },
  });

  try {
    await autoDetectCallOutcome({ userId: user.id, phoneNumber, duration, callType });
  } catch {
    // Best-effort — the call log itself already synced above regardless.
  }

  return NextResponse.json({ ok: true, id: log.id });
}
