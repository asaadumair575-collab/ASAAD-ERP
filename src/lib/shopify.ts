import { createHmac } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { decrypt, encrypt, safeEqual } from "./crypto";
import { db } from "./db";

// Shopify Admin REST API. Stores connect through our Shopify app (OAuth —
// needs SHOPIFY_API_KEY / SHOPIFY_API_SECRET), with the Client ID + secret of
// their own Dev Dashboard app (client credentials grant), or by pasting an
// Admin API access token (shpat_…) from an older custom app.

export const SHOPIFY_API_VERSION = "2026-07";
export const SHOPIFY_SCOPES = "read_orders,read_products,read_customers,read_inventory,read_merchant_managed_fulfillment_orders,write_merchant_managed_fulfillment_orders";

export const shopifyAppConfigured = () => Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET);

export function normalizeShop(input: string) {
  let s = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s) ? s : null;
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

// HMAC check on OAuth callback query strings.
export function verifyOAuthQuery(params: URLSearchParams) {
  const hmac = params.get("hmac");
  if (!hmac || !process.env.SHOPIFY_API_SECRET) return false;
  const message = [...params.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const digest = createHmac("sha256", process.env.SHOPIFY_API_SECRET).update(message).digest("hex");
  return safeEqual(digest, hmac);
}

export function verifyWebhook(rawBody: string, hmacHeader: string | null, secret = process.env.SHOPIFY_API_SECRET) {
  if (!hmacHeader || !secret) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return safeEqual(digest, hmacHeader);
}

type Conn = { id?: number; shopDomain: string; accessToken: string; clientCreds?: string | null; tokenExpiresAt?: Date | null };

// Client credentials grant (Dev Dashboard app installed on the merchant's own
// store): exchanges the app's client ID + secret for a 24-hour Admin API token.
export async function clientCredentialsToken(shop: string, clientId: string, clientSecret: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let body: { access_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string } = {};
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok || !body.access_token) {
    const why = body.error_description || body.error || text.slice(0, 160) || `HTTP ${res.status}`;
    if (/shop_not_permitted/.test(why)) throw new Error("Shopify says this app isn't allowed on this store — create the app from the same Shopify account that owns the store, then install it on the store (see Help → Connect Shopify).");
    throw new Error(`Shopify didn't accept the Client ID / secret: ${why}`);
  }
  return { token: body.access_token, expiresAt: new Date(Date.now() + ((body.expires_in ?? 86399) - 300) * 1000), scope: body.scope ?? null };
}

async function tokenFor(conn: Conn) {
  if (conn.clientCreds && (!conn.tokenExpiresAt || conn.tokenExpiresAt.getTime() < Date.now() + 60_000)) {
    const { clientId, clientSecret } = JSON.parse(decrypt(conn.clientCreds)) as { clientId: string; clientSecret: string };
    const t = await clientCredentialsToken(conn.shopDomain, clientId, clientSecret);
    conn.accessToken = encrypt(t.token);
    conn.tokenExpiresAt = t.expiresAt;
    if (conn.id) await db.shopifyConnection.update({ where: { id: conn.id }, data: { accessToken: conn.accessToken, tokenExpiresAt: t.expiresAt } }).catch(() => null);
  }
  return decrypt(conn.accessToken);
}

async function api(conn: Conn, path: string, init?: RequestInit) {
  const url = path.startsWith("https://") ? path : `https://${conn.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "X-Shopify-Access-Token": await tokenFor(conn), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (res.status === 401 || res.status === 403) throw new Error("Shopify rejected the access token — reconnect the store.");
  if (!res.ok) throw new Error(`Shopify returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const next = res.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  return { data: await res.json(), next };
}

export async function shopInfo(conn: Conn) {
  return (await api(conn, "shop.json")).data?.shop as { name: string; currency: string } | undefined;
}

// ── Mapping Shopify orders into ours ──────────────────────────────────────

type ShopifyOrder = {
  id: number;
  name: string;
  created_at: string;
  cancelled_at: string | null;
  financial_status: string | null;
  payment_gateway_names?: string[];
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  subtotal_price: string;
  total_discounts: string;
  total_price: string;
  total_shipping_price_set?: { shop_money?: { amount?: string } };
  customer?: { id: number; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null;
  shipping_address?: { name?: string | null; phone?: string | null; address1?: string | null; address2?: string | null; city?: string | null } | null;
  line_items: { variant_id: number | null; title: string; variant_title?: string | null; sku?: string | null; quantity: number; price: string }[];
};

export async function upsertShopifyOrder(tenantId: number, o: ShopifyOrder) {
  const ship = o.shipping_address ?? {};
  const name = (ship.name || [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ") || "Customer").trim();
  const phone = ship.phone || o.customer?.phone || o.phone || null;
  const email = o.email || o.customer?.email || null;
  const city = ship.city?.trim() || null;
  const cod = o.financial_status !== "paid" || (o.payment_gateway_names ?? []).some((g) => /cash|cod/i.test(g));

  let customerId: number | null = null;
  if (o.customer?.id) {
    const c = await db.customer.upsert({
      where: { tenantId_shopifyCustomerId: { tenantId, shopifyCustomerId: String(o.customer.id) } },
      update: { name, phone, email, city },
      create: { tenantId, shopifyCustomerId: String(o.customer.id), name, phone, email, city },
    });
    customerId = c.id;
  }

  const variantIds = o.line_items.map((l) => (l.variant_id ? String(l.variant_id) : null)).filter((v): v is string => Boolean(v));
  const products = variantIds.length ? await db.product.findMany({ where: { tenantId, shopifyVariantId: { in: variantIds } }, select: { id: true, shopifyVariantId: true } }) : [];
  const productBy = new Map(products.map((p) => [p.shopifyVariantId, p.id]));

  const base = {
    customerName: name,
    phone,
    email,
    city,
    address: [ship.address1, ship.address2, city].filter(Boolean).join(", ") || null,
    subtotal: parseFloat(o.subtotal_price) || 0,
    discount: parseFloat(o.total_discounts) || 0,
    shippingFee: parseFloat(o.total_shipping_price_set?.shop_money?.amount ?? "0") || 0,
    total: parseFloat(o.total_price) || 0,
    paymentMethod: cod ? ("COD" as const) : ("PREPAID" as const),
    customerId,
  };

  const existing = await db.order.findUnique({ where: { tenantId_shopifyOrderId: { tenantId, shopifyOrderId: String(o.id) } }, select: { id: true, status: true } });
  if (existing) {
    const data: Prisma.OrderUncheckedUpdateInput = { ...base };
    // Shopify cancellation only applies before we've booked the parcel.
    if (o.cancelled_at && (existing.status === "NEW" || existing.status === "CONFIRMED")) {
      data.status = "CANCELLED";
      await db.activity.create({ data: { tenantId, orderId: existing.id, message: "Cancelled in Shopify" } });
    }
    await db.order.update({ where: { id: existing.id }, data });
    return { created: false };
  }

  await db.order.create({
    data: {
      ...base,
      tenantId,
      source: "SHOPIFY",
      shopifyOrderId: String(o.id),
      number: o.name,
      notes: o.note || null,
      status: o.cancelled_at ? "CANCELLED" : "NEW",
      placedAt: new Date(o.created_at),
      items: {
        create: o.line_items.map((l) => ({
          title: l.variant_title ? `${l.title} — ${l.variant_title}` : l.title,
          sku: l.sku || null,
          qty: l.quantity,
          price: parseFloat(l.price) || 0,
          productId: l.variant_id ? productBy.get(String(l.variant_id)) ?? null : null,
        })),
      },
      activity: { create: { tenantId, message: "Order received from Shopify" } },
    },
  });
  return { created: true };
}

type ShopifyProduct = {
  id: number;
  title: string;
  image?: { src: string } | null;
  variants: { id: number; title: string; sku: string | null; price: string; inventory_quantity: number | null }[];
};

export async function syncProducts(tenantId: number, conn: Conn) {
  let path: string | undefined = "products.json?limit=250&status=active";
  let count = 0;
  while (path) {
    const { data, next } = await api(conn, path);
    for (const p of (data.products ?? []) as ShopifyProduct[]) {
      for (const v of p.variants) {
        const variantTitle = v.title && v.title !== "Default Title" ? v.title : null;
        await db.product.upsert({
          where: { tenantId_shopifyVariantId: { tenantId, shopifyVariantId: String(v.id) } },
          update: { title: p.title, variantTitle, sku: v.sku || null, price: parseFloat(v.price) || 0, stock: v.inventory_quantity ?? 0, imageUrl: p.image?.src ?? null },
          create: {
            tenantId,
            shopifyProductId: String(p.id),
            shopifyVariantId: String(v.id),
            title: p.title,
            variantTitle,
            sku: v.sku || null,
            price: parseFloat(v.price) || 0,
            stock: v.inventory_quantity ?? 0,
            imageUrl: p.image?.src ?? null,
          },
        });
        count++;
      }
    }
    path = next;
  }
  return count;
}

export async function syncOrders(tenantId: number, conn: Conn, since?: Date | null) {
  // First sync: last 60 days. Later: anything updated since the last sync (minus a margin).
  const from = since ? new Date(since.getTime() - 10 * 60000) : new Date(Date.now() - 60 * 86400000);
  let path: string | undefined = `orders.json?status=any&limit=250&updated_at_min=${encodeURIComponent(from.toISOString())}`;
  let created = 0;
  let seen = 0;
  while (path) {
    const { data, next } = await api(conn, path);
    for (const o of (data.orders ?? []) as ShopifyOrder[]) {
      seen++;
      if ((await upsertShopifyOrder(tenantId, o)).created) created++;
    }
    path = next;
  }
  return { created, seen };
}

// Full sync for a store: products first (so order lines link to them), then orders.
export async function syncStore(tenantId: number) {
  const conn = await db.shopifyConnection.findUnique({ where: { tenantId } });
  if (!conn) throw new Error("Shopify is not connected.");
  try {
    const products = await syncProducts(tenantId, conn);
    const orders = await syncOrders(tenantId, conn, conn.lastSyncAt);
    await db.shopifyConnection.update({ where: { tenantId }, data: { lastSyncAt: new Date(), syncError: null } });
    return { products, ...orders };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.shopifyConnection.update({ where: { tenantId }, data: { syncError: msg } });
    throw e;
  }
}

// Secret Shopify signs a store's webhooks with: the merchant's own app secret
// for client-credential connections, otherwise ours.
export function webhookSecretFor(conn: { clientCreds?: string | null }) {
  if (conn.clientCreds) return (JSON.parse(decrypt(conn.clientCreds)) as { clientSecret: string }).clientSecret;
  return process.env.SHOPIFY_API_SECRET;
}

export async function registerWebhooks(conn: Conn) {
  const address = `${appUrl()}/api/shopify/webhook`;
  for (const topic of ["orders/create", "orders/updated", "products/update", "app/uninstalled"]) {
    await api(conn, "webhooks.json", { method: "POST", body: JSON.stringify({ webhook: { topic, address, format: "json" } }) }).catch(() => null);
  }
}

// After booking, mark the order fulfilled in Shopify with the tracking number.
export async function fulfillInShopify(conn: Conn, shopifyOrderId: string, tracking: { number: string; company: string; url: string }) {
  const { data } = await api(conn, `orders/${shopifyOrderId}/fulfillment_orders.json`);
  const open = ((data.fulfillment_orders ?? []) as { id: number; status: string }[]).filter((f) => f.status === "open" || f.status === "in_progress");
  if (!open.length) return;
  await api(conn, "fulfillments.json", {
    method: "POST",
    body: JSON.stringify({
      fulfillment: {
        line_items_by_fulfillment_order: open.map((f) => ({ fulfillment_order_id: f.id })),
        tracking_info: tracking,
        notify_customer: true,
      },
    }),
  });
}
