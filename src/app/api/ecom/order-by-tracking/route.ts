import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracking = req.nextUrl.searchParams.get("tracking")?.trim();
  if (!tracking) return NextResponse.json({ error: "tracking is required" }, { status: 400 });

  const order = await prisma.ecomOrder.findFirst({
    where: { trackingNumber: tracking },
    select: { id: true, customerName: true, city: true, totalAmount: true },
  });

  if (!order) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, order });
}
