import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Two indexed count() queries — no row fetching, no joins. Called once on
// page load; the client updates these optimistically after each scan
// instead of re-calling this on every parcel.
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const dayStartPK = new Date(`${todayPK}T00:00:00+05:00`);

  const [processedToday, pending] = await Promise.all([
    prisma.ecomOrder.count({ where: { packedAt: { gte: dayStartPK } } }),
    prisma.ecomOrder.count({ where: { draft: false, packedAt: null, trackingNumber: { not: null } } }),
  ]);

  return NextResponse.json({ processedToday, pending });
}
