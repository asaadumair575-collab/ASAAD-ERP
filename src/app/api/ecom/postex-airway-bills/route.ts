import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAirwayBillPdfWithFallback } from "@/lib/postexInvoice";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const dayStart = new Date(`${date}T00:00:00+05:00`);
  const dayEnd = new Date(`${date}T23:59:59+05:00`);

  const orders = await prisma.ecomOrder.findMany({
    where: { dispatchedAt: { gte: dayStart, lte: dayEnd }, trackingNumber: { not: null } },
    select: { trackingNumber: true },
  });
  const trackingNumbers = orders.map((o) => o.trackingNumber!).filter(Boolean);

  if (trackingNumbers.length === 0) {
    return NextResponse.json({ error: "No dispatched parcels with tracking numbers on this date" }, { status: 404 });
  }

  const result = await fetchAirwayBillPdfWithFallback(trackingNumbers);
  if (result.pdf) {
    return new NextResponse(new Uint8Array(result.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="airway-bills-${date}.pdf"`,
      },
    });
  }

  return NextResponse.json(
    { error: result.error ?? "Could not fetch airway bills", detail: result.detail, trackingNumbers },
    { status: 502 }
  );
}
