import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const fromDate = new Date(`${date}T00:00:00`);
  const toDate = new Date(`${date}T23:59:59.999`);

  const total = await prisma.retailOrder.count({
    where: { date: { gte: fromDate, lte: toDate } },
  });

  return NextResponse.json({ total });
}
