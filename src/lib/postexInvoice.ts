import { prisma } from "@/lib/prisma";

const BASE = "https://api.postex.pk/services/integration/api/order";

function extractPdfBase64(json: Record<string, unknown>): string | null {
  const dist = (json.dist ?? json) as Record<string, unknown>;
  const base64 =
    (dist.invoice as string) ??
    (dist.pdf as string) ??
    (dist.invoiceFile as string) ??
    (dist.file as string) ??
    (json.invoice as string) ??
    (json.pdf as string);
  return typeof base64 === "string" && base64 ? base64 : null;
}

async function tryFetch(url: string, token: string, init?: RequestInit): Promise<{ pdf?: Buffer; error?: string; detail?: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { token, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
      ...init,
    });
  } catch (e) {
    return { error: "network", detail: e instanceof Error ? e.message : String(e) };
  }

  const text = await res.text();
  if (!res.ok) return { error: `HTTP ${res.status}`, detail: text.slice(0, 500) };

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Unexpected response (not JSON)", detail: text.slice(0, 500) };
  }

  const base64 = extractPdfBase64(json);
  if (!base64) return { error: "PDF not found in response", detail: JSON.stringify(json).slice(0, 500) };

  try {
    return { pdf: Buffer.from(base64, "base64") };
  } catch (e) {
    return { error: "Could not decode PDF", detail: e instanceof Error ? e.message : String(e) };
  }
}

// PostEx's label/invoice endpoint's exact URL shape isn't confirmed for this
// account — other PostEx endpoints in this codebase (get-track-order,
// payment-status) take the tracking number as a path param rather than a
// query string, so that's tried first, then the query-string variants this
// route originally used, in case the account/API version differs.
export async function fetchAirwayBillPdf(trackingNumbers: string[], token: string): Promise<{ pdf?: Buffer; error?: string; detail?: string }> {
  const cnList = trackingNumbers.join(",");
  const attempts: { label: string; run: () => Promise<{ pdf?: Buffer; error?: string; detail?: string }> }[] = [];

  if (trackingNumbers.length === 1) {
    attempts.push({ label: "GET path-param", run: () => tryFetch(`${BASE}/v1/get-invoice/${encodeURIComponent(trackingNumbers[0])}`, token) });
  }
  attempts.push({ label: "GET ?trackingNumbers=", run: () => tryFetch(`${BASE}/v1/get-invoice?trackingNumbers=${encodeURIComponent(cnList)}`, token) });
  attempts.push({ label: "GET ?trackingNumber=", run: () => tryFetch(`${BASE}/v1/get-invoice?trackingNumber=${encodeURIComponent(cnList)}`, token) });

  const results: string[] = [];
  for (const attempt of attempts) {
    const result = await attempt.run();
    if (result.pdf) return result;
    results.push(`${attempt.label} → ${result.error}: ${result.detail?.slice(0, 200)}`);
  }
  return { error: "All get-invoice request shapes failed", detail: results.join(" | ") };
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
