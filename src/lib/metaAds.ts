// Ad spend and Meta's own self-reported attribution (purchase_roas /
// action_values) — the only source available for historical dates, since
// our own order-tagging (src/lib/webOrders.ts, source="meta_ads") only
// covers orders placed after that tracking was added. Meta's numbers use
// its own click/view attribution windows and can over-count, so treat them
// as an estimate; prefer verified numbers from tagged orders when present.
export type MetaDailyStat = {
  date: string; // YYYY-MM-DD, Meta's own date_start for the row
  spend: number;
  reportedRevenue: number;
  reportedRoas: number;
};

export type MetaStats = {
  spend: number;
  reportedRevenue: number;
  reportedRoas: number;
  daily: MetaDailyStat[];
  error?: string;
  detail?: string;
};

function rowToDaily(row: Record<string, unknown>): MetaDailyStat {
  const spend = parseFloat(String(row.spend ?? "0")) || 0;

  let reportedRevenue = 0;
  const actionValues = (row.action_values ?? []) as { action_type: string; value: string }[];
  const purchaseAction = actionValues.find((a) => a.action_type === "purchase" || a.action_type === "omni_purchase");
  if (purchaseAction) reportedRevenue = parseFloat(purchaseAction.value) || 0;

  let reportedRoas = spend > 0 ? reportedRevenue / spend : 0;
  const roasField = (row.purchase_roas ?? []) as { action_type: string; value: string }[];
  const purchaseRoas = roasField.find((r) => r.action_type === "purchase" || r.action_type === "omni_purchase");
  if (purchaseRoas) reportedRoas = parseFloat(purchaseRoas.value) || reportedRoas;

  return { date: String(row.date_start ?? ""), spend, reportedRevenue, reportedRoas };
}

// Fetches spend/attribution broken down per day (time_increment=1) so the
// aggregate totals and a daily trend chart come from a single API call.
export async function fetchMetaStats(from: string, to: string): Promise<MetaStats> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID; // e.g. act_1363299608334913
  const empty: MetaStats = { spend: 0, reportedRevenue: 0, reportedRoas: 0, daily: [] };
  if (!token || !accountId) return { ...empty, error: "config" };

  const fields = "spend,action_values,purchase_roas";
  let url: string | null = `https://graph.facebook.com/v21.0/${accountId}/insights?time_range=${encodeURIComponent(
    JSON.stringify({ since: from, until: to })
  )}&time_increment=1&fields=${fields}&limit=500&access_token=${encodeURIComponent(token)}`;

  try {
    // The Graph API paginates insights rows (default page size is small —
    // as low as 25) and this endpoint never followed `paging.next`, so any
    // date range spanning more than a couple dozen days silently dropped
    // rows and understated total spend. Follow every page until exhausted.
    const rows: Record<string, unknown>[] = [];
    while (url) {
      const res: Response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
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
      rows.push(...((json?.data ?? []) as Record<string, unknown>[]));
      url = json?.paging?.next ?? null;
    }

    if (rows.length === 0) return empty; // no spend in this range

    const daily = rows.map(rowToDaily).sort((a, b) => a.date.localeCompare(b.date));
    const spend = daily.reduce((s, d) => s + d.spend, 0);
    const reportedRevenue = daily.reduce((s, d) => s + d.reportedRevenue, 0);
    const reportedRoas = spend > 0 ? reportedRevenue / spend : 0;

    return { spend, reportedRevenue, reportedRoas, daily };
  } catch (e) {
    return { ...empty, error: "network", detail: e instanceof Error ? e.message : String(e) };
  }
}

export type MetaCreative = {
  id: string;
  name: string;
  campaignName: string;
  adsetName: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  thumbnailUrl: string | null;
  spend: number;
};

export type MetaCreativesResult = {
  creatives: MetaCreative[];
  error?: string;
  detail?: string;
};

// Which creatives are currently active and what each is spending — one call
// for the active ads themselves (name, budget, thumbnail), one for spend
// per ad over the selected range, joined by ad id.
export async function fetchActiveCreatives(from: string, to: string): Promise<MetaCreativesResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  if (!token || !accountId) return { creatives: [], error: "config" };

  const adsFields = "id,name,adset{name,daily_budget,lifetime_budget},campaign{name},creative{thumbnail_url}";
  const adsUrl = `https://graph.facebook.com/v21.0/${accountId}/ads?effective_status=${encodeURIComponent(
    JSON.stringify(["ACTIVE"])
  )}&fields=${adsFields}&limit=200&access_token=${encodeURIComponent(token)}`;

  const insightsFields = "ad_id,spend";
  const insightsUrl = `https://graph.facebook.com/v21.0/${accountId}/insights?level=ad&time_range=${encodeURIComponent(
    JSON.stringify({ since: from, until: to })
  )}&fields=${insightsFields}&limit=500&access_token=${encodeURIComponent(token)}`;

  try {
    const [adsRes, insightsRes] = await Promise.all([
      fetch(adsUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
      fetch(insightsUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
    ]);

    const adsBody = await adsRes.text();
    if (!adsRes.ok) {
      let message = `HTTP ${adsRes.status}`;
      try {
        message = JSON.parse(adsBody)?.error?.message ?? message;
      } catch {}
      return { creatives: [], error: `api:${adsRes.status}`, detail: message };
    }

    const spendByAdId = new Map<string, number>();
    if (insightsRes.ok) {
      const insightsJson = JSON.parse(await insightsRes.text());
      for (const row of (insightsJson?.data ?? []) as Record<string, unknown>[]) {
        const adId = String(row.ad_id ?? "");
        if (adId) spendByAdId.set(adId, parseFloat(String(row.spend ?? "0")) || 0);
      }
    }

    const adsJson = JSON.parse(adsBody);
    const rows: Record<string, unknown>[] = adsJson?.data ?? [];

    const creatives: MetaCreative[] = rows.map((row) => {
      const adset = (row.adset ?? {}) as Record<string, unknown>;
      const campaign = (row.campaign ?? {}) as Record<string, unknown>;
      const creative = (row.creative ?? {}) as Record<string, unknown>;
      const id = String(row.id ?? "");
      // Budgets come back in the account currency's minor unit (cents).
      const dailyBudget = adset.daily_budget != null ? Number(adset.daily_budget) / 100 : null;
      const lifetimeBudget = adset.lifetime_budget != null ? Number(adset.lifetime_budget) / 100 : null;

      return {
        id,
        name: String(row.name ?? "Unnamed ad"),
        campaignName: String(campaign.name ?? "—"),
        adsetName: String(adset.name ?? "—"),
        dailyBudget,
        lifetimeBudget,
        thumbnailUrl: (creative.thumbnail_url as string) ?? null,
        spend: spendByAdId.get(id) ?? 0,
      };
    });

    creatives.sort((a, b) => b.spend - a.spend);
    return { creatives };
  } catch (e) {
    return { creatives: [], error: "network", detail: e instanceof Error ? e.message : String(e) };
  }
}
