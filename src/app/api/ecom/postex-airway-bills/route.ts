import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

// PostEx's documented label/invoice endpoint takes comma-separated tracking
// numbers and returns a base64 PDF. Response key naming has varied by
// account in this codebase's experience (see get-track-order iteration),
// so we try the common variants and surface the raw response on failure.
async function fetchAirwayBillPdf(trackingNumbers: string[], token: string): Promise<{ pdf?: Buffer; error?: string; detail?: string }> {
  const cnList = trackingNumbers.join(",");
  const url = `https://api.postex.pk/services/integration/api/order/v1/get-invoice?trackingNumbers=${encodeURIComponent(cnList)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { token, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30000) });
  } catch (e) {
    return { error: "network", detail: e instanceof Error ? e.message : String(e) };
  }

  const text = await res.text();
  if (!res.ok) return { error: `HTTP ${res.status}`, detail: text.slice(0, 500) };

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Unexpected response (not JSON)", detail: text.slice(0, 500) };
  }

  const dist = (json.dist ?? json) as Record<string, unknown>;
  const base64 =
    (dist.invoice as string) ??
    (dist.pdf as string) ??
    (dist.invoiceFile as string) ??
    (dist.file as string) ??
    (json.invoice as string) ??
    (json.pdf as string);

  if (!base64 || typeof base64 !== "string") {
    return { error: "PDF not found in response", detail: JSON.stringify(json).slice(0, 500) };
  }

  try {
    return { pdf: Buffer.from(base64, "base64") };
  } catch (e) {
    return { error: "Could not decode PDF", detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const dayStart = new Date(`${date}T00:00:00+05:00`);
  const dayEnd = new Date(`${date}T23:59:59+05:00`);

  const orders = await prisma.ecomOrder.findMany({
    where: { dispatchedAt: { gte: dayStart, lte: dayEnd }, trackingNumber: { not: null } },
    select: { trackingNumber: true },
  });
  const trackingNumbers = orders.map((o) => o.trackingNumber!).filter(Boolean);

  if (trackingNumbers.length === 0) {
    return NextResponse.json({ error: "No dispatched parcels with tracking numbers on this date" }, { status: 404 });
  }

  const tokens: string[] = [];
  if (process.env.POSTEX_API_TOKEN) tokens.push(process.env.POSTEX_API_TOKEN);
  if (process.env.POSTEX_RETAIL_API_TOKEN) tokens.push(process.env.POSTEX_RETAIL_API_TOKEN);
  if (!process.env.POSTEX_API_TOKEN) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } }).catch(() => null);
    if (setting?.value) tokens.push(setting.value);
  }
  if (tokens.length === 0) {
    return NextResponse.json({ error: "No PostEx API token configured" }, { status: 500 });
  }

  let lastError: { error?: string; detail?: string } = {};
  for (const token of tokens) {
    const result = await fetchAirwayBillPdf(trackingNumbers, token);
    if (result.pdf) {
      return new NextResponse(new Uint8Array(result.pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="airway-bills-${date}.pdf"`,
        },
      });
    }
    lastError = result;
  }

  return NextResponse.json(
    { error: lastError.error ?? "Could not fetch airway bills", detail: lastError.detail, trackingNumbers },
    { status: 502 }
  );
}
