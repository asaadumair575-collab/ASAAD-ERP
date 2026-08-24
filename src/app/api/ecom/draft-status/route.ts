import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, draftStatus } = await req.json();
  await prisma.ecomOrder.update({
    where: { id: Number(id) },
    data: { draftStatus: draftStatus || null },
  });
  return NextResponse.json({ ok: true });
}
