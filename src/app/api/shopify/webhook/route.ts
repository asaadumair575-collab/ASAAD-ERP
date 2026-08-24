import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";

function verify(body: string, hmacHeader: string): boolean {
  if (!SECRET) return false;
  const digest = createHmac("sha256", SECRET).update(body, "utf8").digest("base64");
  return digest === hmacHeader;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";

  if (!verify(rawBody, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";
  if (topic !== "orders/create") {
    return NextResponse.json({ ok: true });
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shopifyOrderId = String(data.id ?? "");
  const existing = await prisma.ecomOrder.findFirst({ where: { shopifyOrderId } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const customer = (data.customer as Record<string, unknown>) ?? {};
  const billingAddress = (data.billing_address as Record<string, unknown>) ?? {};
  const shippingAddress = (data.shipping_address as Record<string, unknown>) ?? {};
  const lineItems = (data.line_items as unknown[]) ?? [];

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    || String(data.contact_email ?? "Unknown");

  const phone = String(customer.phone ?? billingAddress.phone ?? shippingAddress.phone ?? "").replace(/\s/g, "") || null;

  const city = String(shippingAddress.city ?? billingAddress.city ?? "").trim() || null;
  const address = String(shippingAddress.address1 ?? billingAddress.address1 ?? "").trim() || null;

  const totalAmount = parseFloat(String(data.total_price ?? "0")) || 0;

  const order = await prisma.ecomOrder.create({
    data: {
      shopifyOrderId,
      draft: true,
      customerName,
      phone,
      city,
      address,
      totalAmount,
      status: "PENDING",
      date: data.created_at ? new Date(String(data.created_at)) : new Date(),
      notes: `Shopify Order #${data.order_number ?? shopifyOrderId}`,
      items: {
        create: lineItems.map((item) => {
          const i = item as Record<string, unknown>;
          return {
            description: String(i.title ?? i.name ?? "Product"),
            quantity: Number(i.quantity ?? 1),
            packSize: 12,
            rate: parseFloat(String(i.price ?? "0")) || 0,
          };
        }),
      },
    },
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}
