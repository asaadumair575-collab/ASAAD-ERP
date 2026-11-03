import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { sign } from "@/lib/crypto";
import { SHOPIFY_SCOPES, appUrl, normalizeShop, shopifyAppConfigured } from "@/lib/shopify";

// Starts the Shopify OAuth install for the signed-in store owner.
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "OWNER") return NextResponse.redirect(new URL("/login", req.url));
  const back = (msg: string) => NextResponse.redirect(new URL(`/app/integrations?error=${encodeURIComponent(msg)}`, req.url));
  if (!shopifyAppConfigured()) return back("The Shopify app is not set up yet. Use the access token option instead.");
  const shop = normalizeShop(req.nextUrl.searchParams.get("shop") ?? "");
  if (!shop) return back("Enter your store address, e.g. yourstore.myshopify.com");

  const nonce = randomBytes(12).toString("hex");
  const state = `${user.tenantId}.${nonce}`;
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", process.env.SHOPIFY_API_KEY!);
  url.searchParams.set("scope", SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", `${appUrl()}/api/shopify/callback`);
  url.searchParams.set("state", `${state}.${sign(state)}`);
  const res = NextResponse.redirect(url);
  res.cookies.set("sd_shopify_nonce", nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return res;
}
