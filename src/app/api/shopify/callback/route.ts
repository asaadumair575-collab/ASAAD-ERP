import { NextResponse, after, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { encrypt, safeEqual, sign } from "@/lib/crypto";
import { db } from "@/lib/db";
import { normalizeShop, registerWebhooks, syncStore, verifyOAuthQuery } from "@/lib/shopify";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const back = (msg: string, ok = false) => NextResponse.redirect(new URL(`/app/integrations?${ok ? "connected" : "error"}=${encodeURIComponent(msg)}`, req.url));

  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (!verifyOAuthQuery(q)) return back("Shopify could not be verified. Please try again.");

  const [tenantId, nonce, sig] = (q.get("state") ?? "").split(".");
  const cookieNonce = req.cookies.get("sd_shopify_nonce")?.value ?? "";
  if (!sig || !safeEqual(sig, sign(`${tenantId}.${nonce}`)) || Number(tenantId) !== user.tenantId || !safeEqual(nonce, cookieNonce)) {
    return back("The connection request expired. Please try again.");
  }
  const shop = normalizeShop(q.get("shop") ?? "");
  if (!shop) return back("Invalid store address.");

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_API_KEY, client_secret: process.env.SHOPIFY_API_SECRET, code: q.get("code") }),
  });
  if (!tokenRes.ok) return back("Shopify did not grant access. Please try again.");
  const { access_token, scope } = (await tokenRes.json()) as { access_token: string; scope: string };

  const taken = await db.shopifyConnection.findUnique({ where: { shopDomain: shop } });
  if (taken && taken.tenantId !== user.tenantId) return back("This store is already connected to another account.");

  const conn = { shopDomain: shop, accessToken: encrypt(access_token), scope, method: "OAUTH" };
  await db.shopifyConnection.upsert({
    where: { tenantId: user.tenantId },
    update: { ...conn, method: "OAUTH", clientCreds: null, tokenExpiresAt: null, connectedAt: new Date(), lastSyncAt: null, syncError: null },
    create: { tenantId: user.tenantId, ...conn },
  });

  // Webhooks + first import happen after the redirect so the owner isn't kept waiting.
  after(async () => {
    await registerWebhooks(conn);
    await syncStore(user.tenantId).catch(() => null);
  });
  const res = back(`Connected ${shop}. Your orders and products are being imported — refresh in a minute.`, true);
  res.cookies.delete("sd_shopify_nonce");
  return res;
}
