import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatchSheetNumber } from "@/lib/dispatchSheetNumber";

// Gate verification: the whole dispatch sheet is QR-scanned, the combined
// parcel weight is re-scanned off the scale, and this records that final
// weight against the sheet — the last check before the parcels leave.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sheet = await prisma.dispatchSheet.findUnique({ where: { id: Number(id) } });
  if (!sheet) return NextResponse.json({ error: "Dispatch sheet not found" }, { status: 404 });
  if (sheet.dispatchedAt) {
    return NextResponse.json(
      { error: `${dispatchSheetNumber(sheet.id)} was already dispatched at ${sheet.dispatchedAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}.` },
      { status: 409 }
    );
  }

  const { weight, photo } = await req.json();
  const w = Number(weight);
  if (!w || w <= 0) return NextResponse.json({ error: "weight must be a positive number" }, { status: 400 });

  const updated = await prisma.dispatchSheet.update({
    where: { id: sheet.id },
    data: {
      finalWeight: w,
      dispatchedAt: new Date(),
      dispatchedById: me.id,
      photo: typeof photo === "string" && photo.startsWith("data:image/") ? photo : undefined,
    },
  });

  const diff = w - sheet.totalWeight;
  const mismatch = sheet.totalWeight > 0 && Math.abs(diff) > Math.max(0.05, sheet.totalWeight * 0.02);

  return NextResponse.json({
    ok: true,
    sheetNumber: dispatchSheetNumber(updated.id),
    expectedWeight: sheet.totalWeight,
    finalWeight: w,
    mismatch,
  });
}
