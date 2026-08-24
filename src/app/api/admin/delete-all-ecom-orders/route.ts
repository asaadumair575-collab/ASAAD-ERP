import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.ecomOrderItem.deleteMany({});
  await prisma.ecomPayment.deleteMany({});
  const { count } = await prisma.ecomOrder.deleteMany({});

  return NextResponse.json({ ok: true, deleted: count });
}
