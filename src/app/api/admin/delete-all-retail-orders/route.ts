import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.retailOrderItem.deleteMany({});
  await prisma.retailPayment.deleteMany({});
  const { count } = await prisma.retailOrder.deleteMany({});

  return NextResponse.json({ ok: true, deleted: count });
}
