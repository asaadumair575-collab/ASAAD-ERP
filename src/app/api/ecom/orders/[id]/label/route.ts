import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAirwayBillPdfWithFallback } from "@/lib/postexInvoice";

export const maxDuration = 60;

// Serves the Postex shipping label saved in our own system at booking time.
// Orders booked before this existed won't have one saved yet — fetch it
// from Postex once and save it so it's instant next time.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.ecomOrder.findUnique({ where: { id: Number(id) }, select: { trackingNumber: true, label: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.trackingNumber) return NextResponse.json({ error: "This order hasn't been booked on Postex yet" }, { status: 400 });

  let pdf: Uint8Array | Buffer | null = order.label;
  if (!pdf) {
    const result = await fetchAirwayBillPdfWithFallback([order.trackingNumber]);
    if (!result.pdf) {
      return NextResponse.json({ error: result.error ?? "Could not fetch label", detail: result.detail }, { status: 502 });
    }
    pdf = result.pdf;
    await prisma.ecomOrder.update({ where: { id: Number(id) }, data: { label: new Uint8Array(pdf) } });
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="label-${order.trackingNumber}.pdf"`,
    },
  });
}
