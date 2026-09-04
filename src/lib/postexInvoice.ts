import { prisma } from "@/lib/prisma";

const BASE = "https://api.postex.pk/services/integration/api/order";

// Per PostEx's official Merchant API Integration Guide (v4.1.9, section
// 3.10 "Airway Bill API"): GET .../v1/get-invoice?trackingNumbers=CN1,CN2
// — the response body IS the PDF file directly (not JSON containing a
// base64 string), capped at 10 tracking numbers per call.
export async function fetchAirwayBillPdf(trackingNumbers: string[], token: string): Promise<{ pdf?: Buffer; error?: string; detail?: string }> {
  const cnList = trackingNumbers.join(",");
  const url = `${BASE}/v1/get-invoice?trackingNumbers=${encodeURIComponent(cnList)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { token }, cache: "no-store", signal: AbortSignal.timeout(30000) });
  } catch (e) {
    return { error: "network", detail: e instanceof Error ? e.message : String(e) };
  }

  const contentType = res.headers.get("content-type") ?? "";
  const buf = Buffer.from(await res.arrayBuffer());

  if (res.ok && (contentType.includes("pdf") || buf.subarray(0, 5).toString("latin1") === "%PDF-")) {
    return { pdf: buf };
  }

  const text = buf.toString("utf-8");
  if (!res.ok) return { error: `HTTP ${res.status}`, detail: text.slice(0, 500) };
  return { error: "Response wasn't a PDF", detail: text.slice(0, 500) };
}

export async function getPostexTokens(): Promise<string[]> {
  const tokens: string[] = [];
  if (process.env.POSTEX_API_TOKEN) tokens.push(process.env.POSTEX_API_TOKEN);
  if (process.env.POSTEX_RETAIL_API_TOKEN) tokens.push(process.env.POSTEX_RETAIL_API_TOKEN);
  if (!process.env.POSTEX_API_TOKEN) {
    const setting = await prisma.appSetting.findUnique({ where: { key: "POSTEX_API_KEY" } }).catch(() => null);
    if (setting?.value) tokens.push(setting.value);
  }
  return tokens;
}

// Tries every configured token in turn, returning the first PDF that comes
// back, or the last error if none work.
export async function fetchAirwayBillPdfWithFallback(trackingNumbers: string[]): Promise<{ pdf?: Buffer; error?: string; detail?: string }> {
  const tokens = await getPostexTokens();
  if (tokens.length === 0) return { error: "No PostEx API token configured" };

  let lastError: { error?: string; detail?: string } = {};
  for (const token of tokens) {
    const result = await fetchAirwayBillPdf(trackingNumbers, token);
    if (result.pdf) return result;
    lastError = result;
  }
  return lastError;
}
