import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tracking = searchParams.get("cn") ?? "29423830003053";

  let key = process.env.POSTEX_API_KEY;
  if (!key) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } });
    key = setting?.value ?? undefined;
  }

  if (!key) return NextResponse.json({ error: "Key not set" });

  const endpoints: { url: string; label: string; headers: Record<string, string> }[] = [
    { url: `https://api.postex.pk/services/integration/api/order/v3/get-track-order/${tracking}`, label: "v3 token header", headers: { token: key, "Content-Type": "application/json" } },
    { url: `https://api.postex.pk/services/integration/api/order/v2/get-track-order/${tracking}`, label: "v2 token header", headers: { token: key, "Content-Type": "application/json" } },
    { url: `https://api.postex.pk/services/integration/api/order/v3/get-track-order/${tracking}`, label: "v3 Authorization Token", headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" } },
    { url: `https://api.postex.pk/services/integration/api/order/v3/get-track-order/${tracking}`, label: "v3 Authorization Bearer", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } },
  ];

  const results = [];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { method: "GET", headers: ep.headers as HeadersInit, cache: "no-store" });
      const text = await res.text();
      results.push({ label: ep.label, status: res.status, body: text.slice(0, 300) });
    } catch (e) {
      results.push({ label: ep.label, status: "error", body: String(e) });
    }
  }

  return NextResponse.json({ keyPreview: `${key.slice(0, 8)}...`, results });
}
