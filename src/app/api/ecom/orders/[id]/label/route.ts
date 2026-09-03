import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAirwayBillPdfWithFallback } from "@/lib/postexInvoice";

export const maxDuration = 60;

// Fetches the Postex shipping label/airway bill for a single order —
// available on the order detail page once it's been booked.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.ecomOrder.findUnique({ where: { id: Number(id) }, select: { trackingNumber: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.trackingNumber) return NextResponse.json({ error: "This order hasn't been booked on Postex yet" }, { status: 400 });

  const result = await fetchAirwayBillPdfWithFallback([order.trackingNumber]);
  if (result.pdf) {
    return new NextResponse(new Uint8Array(result.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="label-${order.trackingNumber}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: result.error ?? "Could not fetch label", detail: result.detail }, { status: 502 });
}
