import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicApiRateLimit } from "@/lib/publicApiRateLimit";
import { timingSafeEqualStr } from "@/lib/timingSafeEqual";

// POST /api/public/visit
// Headers: X-Api-Key: <ORDER_INTAKE_API_KEY>
// Body: { "visitorId": "<a stable per-browser id, e.g. from localStorage>", "path": "/optional/page" }
//
// Called once per page load from the storefront to power the "Website Visitors"
// stat on the ERP dashboard. visitorId should be a random id the site generates
// once and stores in localStorage — that's what makes "unique visitors" possible.

export async function POST(req: NextRequest) {
  const key = process.env.ORDER_INTAKE_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });
  if (!timingSafeEqualStr(req.headers.get("x-api-key"), key)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const limited = publicApiRateLimit(req);
  if (limited) return NextResponse.json({ ok: false, error: limited }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const visitorId = String(body.visitorId ?? "").trim().slice(0, 100);
  if (!visitorId) return NextResponse.json({ ok: false, error: "visitorId is required" }, { status: 400 });

  const path = body.path ? String(body.path).trim().slice(0, 200) : null;

  await prisma.websiteVisit.create({ data: { visitorId, path } });

  return NextResponse.json({ ok: true });
}
