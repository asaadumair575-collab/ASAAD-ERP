// Only ad spend is pulled from Meta — it's the one number Meta reports
// accurately. Revenue and ROAS are calculated from our own website orders
// (src/lib/webOrders.ts), not from Meta's self-reported attribution, which
// tends to over-count purchases via its own click/view attribution windows.
export type MetaStats = {
  spend: number;
  error?: string;
  detail?: string;
};

export async function fetchMetaStats(from: string, to: string): Promise<MetaStats> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID; // e.g. act_1363299608334913
  const empty: MetaStats = { spend: 0 };
  if (!token || !accountId) return { ...empty, error: "config" };

  const url = `https://graph.facebook.com/v21.0/${accountId}/insights?time_range=${encodeURIComponent(
    JSON.stringify({ since: from, until: to })
  )}&fields=spend&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(body);
        message = parsed?.error?.message ?? message;
      } catch {
        // body wasn't JSON
      }
      return { ...empty, error: `api:${res.status}`, detail: message };
    }
    const json = JSON.parse(body);
    const row = json?.data?.[0];
    if (!row) return empty; // no spend in this range

    const spend = parseFloat(row.spend ?? "0") || 0;
    return { spend };
  } catch (e) {
    return { ...empty, error: "network", detail: e instanceof Error ? e.message : String(e) };
  }
}
