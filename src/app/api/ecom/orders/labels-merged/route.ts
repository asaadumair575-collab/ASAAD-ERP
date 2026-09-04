import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAirwayBillPdfWithFallback } from "@/lib/postexInvoice";
import { PDFDocument } from "pdf-lib";

export const maxDuration = 60;

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const LABELS_PER_PAGE = 3;
const SLOT_HEIGHT = A4_HEIGHT / LABELS_PER_PAGE;

// Combines each selected order's saved Postex label onto A4 sheets, 3 labels
// per page stacked vertically — matching how Postex's own bulk label print
// lays them out, so multiple parcels can be printed on one sheet instead of
// one page per parcel.
export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").map(Number).filter((n) => !Number.isNaN(n)) : [];
  if (ids.length === 0) return NextResponse.json({ error: "ids is required" }, { status: 400 });

  const orders = await prisma.ecomOrder.findMany({
    where: { id: { in: ids } },
    select: { id: true, trackingNumber: true, label: true },
  });

  const merged = await PDFDocument.create();
  const missing: number[] = [];
  const embeddedPages: Awaited<ReturnType<typeof merged.embedPdf>>[number][] = [];

  // Preserve the order the caller selected, not the DB query order.
  const byId = new Map(orders.map((o) => [o.id, o]));
  for (const id of ids) {
    const order = byId.get(id);
    if (!order?.trackingNumber) {
      missing.push(id);
      continue;
    }

    let bytes: Uint8Array | Buffer | null = order.label;
    if (!bytes) {
      const result = await fetchAirwayBillPdfWithFallback([order.trackingNumber]);
      if (!result.pdf) {
        missing.push(id);
        continue;
      }
      bytes = result.pdf;
      await prisma.ecomOrder.update({ where: { id: order.id }, data: { label: new Uint8Array(result.pdf) } }).catch(() => {});
    }

    try {
      const [page] = await merged.embedPdf(bytes, [0]);
      embeddedPages.push(page);
    } catch {
      missing.push(id);
    }
  }

  if (embeddedPages.length === 0) {
    return NextResponse.json({ error: "No labels available for the selected orders", missing }, { status: 400 });
  }

  for (let i = 0; i < embeddedPages.length; i += LABELS_PER_PAGE) {
    const sheet = merged.addPage([A4_WIDTH, A4_HEIGHT]);
    const slice = embeddedPages.slice(i, i + LABELS_PER_PAGE);
    slice.forEach((embedded, slot) => {
      const scale = Math.min(A4_WIDTH / embedded.width, SLOT_HEIGHT / embedded.height);
      const w = embedded.width * scale;
      const h = embedded.height * scale;
      const x = (A4_WIDTH - w) / 2;
      const y = A4_HEIGHT - (slot + 1) * SLOT_HEIGHT + (SLOT_HEIGHT - h) / 2;
      sheet.drawPage(embedded, { x, y, width: w, height: h });
    });
  }

  const pdfBytes = await merged.save();

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="labels-${ids.length}-parcels.pdf"`,
    },
  });
}
