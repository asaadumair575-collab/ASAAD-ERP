// Ad spend and Meta's own self-reported attribution (purchase_roas /
// action_values) — the only source available for historical dates, since
// our own order-tagging (src/lib/webOrders.ts, source="meta_ads") only
// covers orders placed after that tracking was added. Meta's numbers use
// its own click/view attribution windows and can over-count, so treat them
// as an estimate; prefer verified numbers from tagged orders when present.
export type MetaStats = {
  spend: number;
  reportedRevenue: number;
  reportedRoas: number;
  error?: string;
  detail?: string;
};

export async function fetchMetaStats(from: string, to: string): Promise<MetaStats> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID; // e.g. act_1363299608334913
  const empty: MetaStats = { spend: 0, reportedRevenue: 0, reportedRoas: 0 };
  if (!token || !accountId) return { ...empty, error: "config" };

  const fields = "spend,action_values,purchase_roas";
  const url = `https://graph.facebook.com/v21.0/${accountId}/insights?time_range=${encodeURIComponent(
    JSON.stringify({ since: from, until: to })
  )}&fields=${fields}&access_token=${encodeURIComponent(token)}`;

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

    let reportedRevenue = 0;
    const actionValues: { action_type: string; value: string }[] = row.action_values ?? [];
    const purchaseAction = actionValues.find((a) => a.action_type === "purchase" || a.action_type === "omni_purchase");
    if (purchaseAction) reportedRevenue = parseFloat(purchaseAction.value) || 0;

    let reportedRoas = spend > 0 ? reportedRevenue / spend : 0;
    const roasField: { action_type: string; value: string }[] = row.purchase_roas ?? [];
    const purchaseRoas = roasField.find((r) => r.action_type === "purchase" || r.action_type === "omni_purchase");
    if (purchaseRoas) reportedRoas = parseFloat(purchaseRoas.value) || reportedRoas;

    return { spend, reportedRevenue, reportedRoas };
  } catch (e) {
    return { ...empty, error: "network", detail: e instanceof Error ? e.message : String(e) };
  }
}
