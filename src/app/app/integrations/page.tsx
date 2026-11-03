import ActionButton from "@/components/ActionButton";
import ConfirmButton from "@/components/ConfirmButton";
import ResultForm from "@/components/ResultForm";
import { Badge, Card, CardHeader, Notice, PageHeader, btn, inputCls } from "@/components/ui";
import type { Courier } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { COURIER_INFO } from "@/lib/couriers";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { shopifyAppConfigured } from "@/lib/shopify";
import { connectCourier, connectShopifyWithToken, disconnectCourier, disconnectShopify, syncShopifyNow } from "../actions";

const COURIERS: Courier[] = ["POSTEX", "LEOPARDS", "TCS"];

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const owner = user.role === "OWNER";
  const [shopify, couriers] = await Promise.all([
    db.shopifyConnection.findUnique({ where: { tenantId: user.tenantId } }),
    db.courierAccount.findMany({ where: { tenantId: user.tenantId }, select: { courier: true, createdAt: true } }),
  ]);
  const connected = new Map(couriers.map((c) => [c.courier, c]));

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Integrations" description="Connect your store and couriers once. Orders, tracking and stock then update on their own." />
      {sp.connected && <Notice tone="success">{sp.connected}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}

      <Card>
        <CardHeader title="Shopify" action={shopify ? <Badge className="bg-green-50 text-green-700 ring-green-200">Connected</Badge> : <Badge>Not connected</Badge>} />
        <div className="p-4 space-y-4 text-sm">
          {shopify ? (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><p className="text-gray-500">Store</p><p className="font-medium">{shopify.shopDomain}</p></div>
                <div><p className="text-gray-500">Connected</p><p>{fmtDateTime(shopify.connectedAt)}</p></div>
                <div><p className="text-gray-500">Last sync</p><p>{shopify.lastSyncAt ? fmtDateTime(shopify.lastSyncAt) : "In progress…"}</p></div>
              </div>
              {shopify.syncError && <Notice tone="error">Last sync failed: {shopify.syncError}</Notice>}
              <p className="text-gray-500">
                {shopify.method === "OAUTH" ? "New orders arrive instantly. " : "New orders are pulled every few minutes while you use the app. "}
                Booked parcels are marked fulfilled in Shopify with the tracking number.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton action={syncShopifyNow} label="Sync now" pendingLabel="Syncing…" />
                {owner && (
                  <form action={disconnectShopify}>
                    <ConfirmButton message="Disconnect Shopify? Existing orders stay; new ones stop coming in." className={btn("danger")}>Disconnect</ConfirmButton>
                  </form>
                )}
              </div>
            </>
          ) : !owner ? (
            <p className="text-gray-500">Ask the account owner to connect Shopify.</p>
          ) : (
            <>
              {shopifyAppConfigured() && (
                <form action="/api/shopify/install" method="GET" className="flex flex-wrap gap-2">
                  <input name="shop" required placeholder="yourstore.myshopify.com" className={`${inputCls} max-w-xs`} />
                  <button className={btn("primary")}>Connect Shopify</button>
                </form>
              )}
              <details className="rounded-md border border-gray-200 p-3" open={!shopifyAppConfigured()}>
                <summary className="cursor-pointer font-medium text-gray-700">Connect with an Admin API access token</summary>
                <p className="text-gray-500 mt-2 mb-3">In Shopify admin: Settings → Apps → Develop apps → your app → API credentials. The token needs read access to orders, products and customers.</p>
                <ResultForm action={connectShopifyWithToken} submitLabel="Connect" pendingLabel="Connecting and importing…">
                  <input name="shop" required placeholder="yourstore.myshopify.com" className={inputCls} />
                  <input name="token" required type="password" placeholder="shpat_…" className={inputCls} autoComplete="off" />
                </ResultForm>
              </details>
            </>
          )}
        </div>
      </Card>

      {user.tenant.isDemo && (
        <Notice tone="info">This demo account books with <strong>Demo Courier</strong> — a simulated courier that moves parcels to delivered or returned over a couple of days. Real couriers below work the same way once connected.</Notice>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {COURIERS.map((c) => {
          const info = COURIER_INFO[c];
          const acc = connected.get(c);
          return (
            <Card key={c} className="flex flex-col">
              <CardHeader title={info.name} action={acc ? <Badge className="bg-green-50 text-green-700 ring-green-200">Connected</Badge> : <Badge>Not connected</Badge>} />
              <div className="p-4 text-sm flex-1 space-y-3">
                {info.note && <p className="text-gray-500">{info.note}</p>}
                {acc ? (
                  <>
                    <p className="text-gray-500">Connected {fmtDateTime(acc.createdAt)}. Book parcels from Orders.</p>
                    {owner && (
                      <form action={disconnectCourier.bind(null, c)}>
                        <ConfirmButton message={`Disconnect ${info.name}?`} className={btn("danger", "sm")}>Disconnect</ConfirmButton>
                      </form>
                    )}
                  </>
                ) : owner ? (
                  <ResultForm action={connectCourier.bind(null, c)} submitLabel="Connect" pendingLabel="Checking…">
                    {info.fields.map((f) => (
                      <label key={f.key} className="block">
                        <span className="block text-xs font-medium text-gray-600 mb-1">{f.label}{f.optional && " (optional)"}</span>
                        <input name={f.key} type={f.secret ? "password" : "text"} required={!f.optional} placeholder={f.placeholder} autoComplete="off" className={inputCls} />
                      </label>
                    ))}
                  </ResultForm>
                ) : (
                  <p className="text-gray-500">Ask the account owner to connect.</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
