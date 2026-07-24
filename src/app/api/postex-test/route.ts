import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tracking = searchParams.get("cn") ?? "25423830003057";

  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }
  if (!key) return NextResponse.json({ error: "Key not set" });

  const BASE = "https://api.postex.pk/services/integration";
  const h = { token: key, "Content-Type": "application/json" };

  const attempts: { label: string; url: string; method: string; body?: string }[] = [
    { label: "GET v3 by CN",         url: `${BASE}/api/order/v3/get-track-order/${tracking}`,  method: "GET" },
    { label: "GET v2 by CN",         url: `${BASE}/api/order/v2/get-track-order/${tracking}`,  method: "GET" },
    { label: "GET v1 by CN",         url: `${BASE}/api/order/v1/get-track-order/${tracking}`,  method: "GET" },
    { label: "POST v3 body orderRef",url: `${BASE}/api/order/v3/get-track-order`,              method: "POST", body: JSON.stringify({ orderRef: tracking }) },
    { label: "POST v3 body CN",      url: `${BASE}/api/order/v3/get-track-order`,              method: "POST", body: JSON.stringify({ trackingNumber: tracking }) },
    { label: "GET v3 order-status",  url: `${BASE}/api/order/v3/get-order-status/${tracking}`, method: "GET" },
    { label: "GET v3 order",         url: `${BASE}/api/order/v3/get-order/${tracking}`,        method: "GET" },
    { label: "GET v3 track",         url: `${BASE}/api/order/v3/track/${tracking}`,             method: "GET" },
  ];

  const results = [];
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: h as HeadersInit,
        ...(a.body ? { body: a.body } : {}),
        cache: "no-store",
      });
      const text = await res.text();
      results.push({ label: a.label, status: res.status, body: text.slice(0, 200) });
      if (res.ok) break; // stop at first success
    } catch (e) {
      results.push({ label: a.label, status: "err", body: String(e).slice(0, 100) });
    }
  }

  return NextResponse.json({ tracking, results });
}
