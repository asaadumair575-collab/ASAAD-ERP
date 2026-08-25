import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// Only leads an admin has explicitly marked "Active on App" (see
// toggleLeadActiveOnApp in actions.ts) show up here — a deliberate opt-in
// list rather than every pending lead from every active campaign, so what's
// on the phone stays exactly what was chosen for it.
export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing API token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { apiToken: token } });
  if (!user) {
    return NextResponse.json({ error: "Invalid API token" }, { status: 401 });
  }

  const leads = await prisma.reorderLead.findMany({
    where: { status: "PENDING", activeOnApp: true, campaign: { isActive: true } },
    select: {
      id: true,
      customerName: true,
      phone: true,
      city: true,
      prevItem: true,
      campaign: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json(
    leads.map((l) => ({
      id: String(l.id),
      customerName: l.customerName,
      phone: l.phone,
      city: l.city,
      prevItem: l.prevItem,
      campaignName: l.campaign.name,
    }))
  );
}
