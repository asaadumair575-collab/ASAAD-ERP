import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatchSheetNumber } from "@/lib/dispatchSheetNumber";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sheet = await prisma.dispatchSheet.findUnique({ where: { id: Number(id) } });
  if (!sheet) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    sheet: {
      id: sheet.id,
      sheetNumber: dispatchSheetNumber(sheet.id),
      date: sheet.date,
      totalParcels: sheet.totalParcels,
      totalValue: sheet.totalValue,
      totalWeight: sheet.totalWeight,
      dispatchedAt: sheet.dispatchedAt,
      finalWeight: sheet.finalWeight,
    },
  });
}
