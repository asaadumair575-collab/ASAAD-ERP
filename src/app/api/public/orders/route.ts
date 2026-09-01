import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public order intake for external storefronts (e.g. a custom website).
// The caller authenticates with a shared secret via the X-Api-Key header.
//
// POST /api/public/orders
// Headers: X-Api-Key: <ORDER_INTAKE_API_KEY>
// Body:
// {
//   "customerName": "Ali Khan",
//   "phone": "03001234567",
//   "city": "Lahore",
//   "address": "House 12, Street 4",
//   "notes": "optional",
//   "totalAmount": 2500,
//   "orderRef": "optional external order id (dedupes on retry)",
//   "items": [{ "description": "Product A", "quantity": 1, "rate": 2500 }]
// }
//
// Creates a draft EcomOrder (Retail COD -> Draft Orders) for manual confirmation.

type IncomingItem = { description?: string; quantity?: number; rate?: number };

export async function POST(req: NextRequest) {
  const key = process.env.ORDER_INTAKE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Server not configured: ORDER_INTAKE_API_KEY missing" }, { status: 500 });
  }
  if (req.headers.get("x-api-key") !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customerName = String(body.customerName ?? "").trim();
  const totalAmount = Number(body.totalAmount ?? 0);
  if (!customerName) return NextResponse.json({ error: "customerName is required" }, { status: 400 });
  if (!totalAmount || totalAmount <= 0) return NextResponse.json({ error: "totalAmount must be a positive number" }, { status: 400 });

  const phone = body.phone ? String(body.phone).replace(/\s/g, "") : null;
  const city = body.city ? String(body.city).trim() : null;
  const address = body.address ? String(body.address).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const orderRef = body.orderRef ? String(body.orderRef).trim() : null;

  const externalRef = orderRef ? `web:${orderRef}` : null;

  if (externalRef) {
    const existing = await prisma.ecomOrder.findFirst({ where: { shopifyOrderId: externalRef } });
    if (existing) return NextResponse.json({ ok: true, orderId: existing.id, duplicate: true });
  }

  const items: IncomingItem[] = Array.isArray(body.items) ? (body.items as IncomingItem[]) : [];

  const order = await prisma.ecomOrder.create({
    data: {
      customerName,
      phone,
      city,
      address,
      notes,
      totalAmount,
      draft: true,
      status: "PENDING",
      shopifyOrderId: externalRef,
      items: {
        create: items
          .filter((i) => i.description)
          .map((i) => ({
            description: String(i.description),
            quantity: Number(i.quantity ?? 1),
            packSize: 1,
            rate: Number(i.rate ?? 0),
          })),
      },
    },
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}
