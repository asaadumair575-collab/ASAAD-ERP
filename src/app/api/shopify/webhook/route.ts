import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { upsertShopifyOrder, verifyWebhook, webhookSecretFor } from "@/lib/shopify";

// Shopify pushes new and changed orders here (registered when a store
// connects through OAuth or with its own app's Client ID + secret).
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";
  const conn = shop ? await db.shopifyConnection.findUnique({ where: { shopDomain: shop } }) : null;
  const secret = conn ? webhookSecretFor(conn) : process.env.SHOPIFY_API_SECRET;
  if (!verifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"), secret)) return new NextResponse("Unauthorized", { status: 401 });
  if (!conn) return NextResponse.json({ ok: true });

  const body = JSON.parse(raw);
  if (topic === "orders/create" || topic === "orders/updated") {
    await upsertShopifyOrder(conn.tenantId, body);
  } else if (topic === "products/update") {
    for (const v of body.variants ?? []) {
      await db.product.updateMany({
        where: { tenantId: conn.tenantId, shopifyVariantId: String(v.id) },
        data: { title: body.title, price: parseFloat(v.price) || 0, stock: v.inventory_quantity ?? 0 },
      });
    }
  } else if (topic === "app/uninstalled") {
    await db.shopifyConnection.delete({ where: { id: conn.id } });
  }
  return NextResponse.json({ ok: true });
}
