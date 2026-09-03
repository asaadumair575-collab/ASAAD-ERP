import { prisma } from "@/lib/prisma";

// PostEx's documented label/invoice endpoint takes comma-separated tracking
// numbers and returns a base64 PDF. Response key naming has varied by
// account in this codebase's experience, so try the common variants and
// surface the raw response on failure.
export async function fetchAirwayBillPdf(trackingNumbers: string[], token: string): Promise<{ pdf?: Buffer; error?: string; detail?: string }> {
  const cnList = trackingNumbers.join(",");
  const url = `https://api.postex.pk/services/integration/api/order/v1/get-invoice?trackingNumbers=${encodeURIComponent(cnList)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { token, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30000) });
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

  const dist = (json.dist ?? json) as Record<string, unknown>;
  const base64 =
    (dist.invoice as string) ??
    (dist.pdf as string) ??
    (dist.invoiceFile as string) ??
    (dist.file as string) ??
    (json.invoice as string) ??
    (json.pdf as string);

  if (!base64 || typeof base64 !== "string") {
    return { error: "PDF not found in response", detail: JSON.stringify(json).slice(0, 500) };
  }

  try {
    return { pdf: Buffer.from(base64, "base64") };
  } catch (e) {
    return { error: "Could not decode PDF", detail: e instanceof Error ? e.message : String(e) };
  }
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
