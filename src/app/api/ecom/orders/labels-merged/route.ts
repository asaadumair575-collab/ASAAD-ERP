import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAirwayBillPdfWithFallback } from "@/lib/postexInvoice";
import { PDFDocument } from "pdf-lib";

export const maxDuration = 60;

// Postex's own get-invoice API already lays multiple tracking numbers out
// 3-per-A4-page when you pass more than one — so this just batches the
// selected orders' tracking numbers into groups of 10 (Postex's documented
// max per call) and stitches the resulting PDFs' pages together, rather
// than trying to reconstruct that layout ourselves.
const POSTEX_MAX_PER_CALL = 10;

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").map(Number).filter((n) => !Number.isNaN(n)) : [];
  if (ids.length === 0) return NextResponse.json({ error: "ids is required" }, { status: 400 });

  const orders = await prisma.ecomOrder.findMany({
    where: { id: { in: ids } },
    select: { id: true, trackingNumber: true },
  });
  const byId = new Map(orders.map((o) => [o.id, o]));

  // Preserve the order the caller selected the orders in.
  const trackingNumbers = ids
    .map((id) => byId.get(id)?.trackingNumber)
    .filter((t): t is string => !!t);

  if (trackingNumbers.length === 0) {
    return NextResponse.json({ error: "None of the selected orders have been booked on Postex yet" }, { status: 400 });
  }

  const chunks: string[][] = [];
  for (let i = 0; i < trackingNumbers.length; i += POSTEX_MAX_PER_CALL) {
    chunks.push(trackingNumbers.slice(i, i + POSTEX_MAX_PER_CALL));
  }

  const merged = await PDFDocument.create();
  let anySucceeded = false;
  let lastError: string | undefined;

  for (const chunk of chunks) {
    const result = await fetchAirwayBillPdfWithFallback(chunk);
    if (!result.pdf) {
      lastError = result.error;
      continue;
    }
    anySucceeded = true;
    const chunkDoc = await PDFDocument.load(result.pdf);
    const pages = await merged.copyPages(chunkDoc, chunkDoc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  if (!anySucceeded) {
    return NextResponse.json({ error: lastError ?? "Could not fetch labels" }, { status: 502 });
  }

  const pdfBytes = await merged.save();

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="labels-${trackingNumbers.length}-parcels.pdf"`,
    },
  });
}
