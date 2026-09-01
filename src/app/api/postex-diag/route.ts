import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const maxDuration = 60;

const BASE = "https://api.postex.pk/services/integration/api/order";

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const cn = searchParams.get("cn") ?? "21676630000014";

  const tokens: { name: string; value: string }[] = [];
  if (process.env.POSTEX_API_TOKEN) tokens.push({ name: "POSTEX_API_TOKEN", value: process.env.POSTEX_API_TOKEN });
  if (process.env.POSTEX_RETAIL_API_TOKEN) tokens.push({ name: "POSTEX_RETAIL_API_TOKEN", value: process.env.POSTEX_RETAIL_API_TOKEN });
  if (process.env.POSTEX_API_KEY) tokens.push({ name: "POSTEX_API_KEY(env)", value: process.env.POSTEX_API_KEY });
  const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } }).catch(() => null);
  if (setting?.value) tokens.push({ name: "POSTEX_API_KEY(setting)", value: setting.value });

  const mode = searchParams.get("mode") ?? "list";
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const results: { token: string; auth: string; url: string; status: number | string; body: string }[] = [];

  for (const t of tokens) {
    const headerStyles: { auth: string; headers: Record<string, string> }[] = [
      { auth: "token", headers: { token: t.value, "Content-Type": "application/json" } },
      { auth: "Basic", headers: { Authorization: `Basic ${t.value}`, "Content-Type": "application/json" } },
      { auth: "Bearer", headers: { Authorization: `Bearer ${t.value}`, "Content-Type": "application/json" } },
    ];

    const urls =
      mode === "track"
        ? ["v3", "v1"].map((v) => `${BASE}/${v}/get-track-order/${cn}`)
        : [
            `${BASE}/v1/get-all-order?orderStatusID=0&fromDate=${from}&toDate=${to}`,
            `${BASE}/v2/get-all-order?orderStatusID=0&fromDate=${from}&toDate=${to}`,
            `${BASE}/v3/get-all-order?orderStatusID=0&fromDate=${from}&toDate=${to}`,
            `${BASE}/v1/get-all-order?fromDate=${from}&toDate=${to}`,
            `${BASE}/v1/get-all-order?orderStatusID=0&startDate=${from}&endDate=${to}`,
            `${BASE}/v2/get-unbooked-orders`,
            `https://api.postex.pk/services/integration/api/order/v1/get-order-list?fromDate=${from}&toDate=${to}`,
          ];

    for (const hs of headerStyles) {
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: hs.headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
          const body = (await res.text()).slice(0, 300);
          results.push({ token: t.name, auth: hs.auth, url: url.replace(BASE, ""), status: res.status, body });
          if (res.ok) break;
        } catch (e) {
          results.push({ token: t.name, auth: hs.auth, url: url.replace(BASE, ""), status: "err", body: String(e).slice(0, 100) });
        }
      }
    }
  }

  return NextResponse.json({ mode, from, to, cn, tokensConfigured: tokens.map((t) => t.name), results });
}
