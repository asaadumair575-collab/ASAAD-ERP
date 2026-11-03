import ActionButton from "@/components/ActionButton";
import ConfirmButton from "@/components/ConfirmButton";
import ResultForm from "@/components/ResultForm";
import Link from "next/link";
import { Badge, Card, CardHeader, Field, LinkButton, Notice, PageHeader, btn, inputCls } from "@/components/ui";
import type { Courier } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { COURIER_INFO } from "@/lib/couriers";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { shopifyAppConfigured } from "@/lib/shopify";
import { connectCourier, connectShopifyWithClient, connectShopifyWithToken, disconnectCourier, disconnectShopify, syncShopifyNow } from "../actions";

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
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Integrations" description="Connect your store and couriers once. Orders, tracking and stock then update on their own."
        actions={<LinkButton href="/app/help/api-webhooks" variant="secondary">Webhooks & API details</LinkButton>} />
      {sp.connected && <Notice tone="success">{sp.connected}</Notice>}
      {sp.error && <Notice tone="error">{sp.error}</Notice>}

      <Card>
        <CardHeader title="Shopify" action={shopify ? <Badge className="bg-green-50 text-green-700 ring-green-200">Connected</Badge> : <Badge>Not connected</Badge>} />
        <div className="px-5 pb-5 space-y-4 text-sm">
          {shopify ? (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><p className="text-gray-500">Store</p><p className="font-medium">{shopify.shopDomain}</p></div>
                <div><p className="text-gray-500">Connected</p><p>{fmtDateTime(shopify.connectedAt)} · {shopify.method === "CLIENT" ? "Client ID" : shopify.method === "TOKEN" ? "Access token" : "Shopify app"}</p></div>
                <div><p className="text-gray-500">Last sync</p><p>{shopify.lastSyncAt ? fmtDateTime(shopify.lastSyncAt) : "In progress…"}</p></div>
              </div>
              {shopify.syncError && <Notice tone="error">Last sync failed: {shopify.syncError}</Notice>}
              <p className="text-gray-500">
                {shopify.method === "TOKEN" ? "New orders are pulled every 10 minutes while you use the app, and nightly. " : "New orders arrive instantly through Shopify webhooks. "}
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
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="font-semibold text-gray-950 mb-2">One-click connect</p>
                  <form action="/api/shopify/install" method="GET" className="flex flex-wrap gap-2">
                    <input name="shop" required placeholder="yourstore.myshopify.com" className={`${inputCls} max-w-xs`} />
                    <button className={btn("primary")}>Connect Shopify</button>
                  </form>
                </div>
              )}
              <details className="rounded-xl border border-gray-200 p-4 group" open={!shopifyAppConfigured()}>
                <summary className="cursor-pointer font-semibold text-gray-950 list-none flex items-center justify-between">
                  <span>Connect with Client ID + Client secret <span className="ml-1 rounded-full bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5">Recommended</span></span>
                  <span className="text-gray-400 text-xs group-open:hidden">Show</span>
                </summary>
                <p className="text-gray-500 mt-2 mb-3">Create a small app for your store in Shopify&apos;s Dev Dashboard, install it, and paste its keys here. <Link href="/app/help/connect-shopify#client" className="text-gray-950 underline font-medium">Step-by-step guide (5 min)</Link></p>
                <ResultForm action={connectShopifyWithClient} submitLabel="Connect" pendingLabel="Connecting and importing…">
                  <Field label="Store address"><input name="shop" required placeholder="yourstore.myshopify.com" className={inputCls} /></Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Client ID"><input name="clientId" required className={inputCls} autoComplete="off" /></Field>
                    <Field label="Client secret"><input name="clientSecret" required type="password" placeholder="shpss_…" className={inputCls} autoComplete="off" /></Field>
                  </div>
                </ResultForm>
              </details>
              <details className="rounded-xl border border-gray-200 p-4 group">
                <summary className="cursor-pointer font-semibold text-gray-950 list-none flex items-center justify-between">
                  <span>Connect with an Admin API access token (shpat_…)</span>
                  <span className="text-gray-400 text-xs group-open:hidden">Show</span>
                </summary>
                <p className="text-gray-500 mt-2 mb-3">Only for custom apps made in Shopify admin before 2026. <Link href="/app/help/connect-shopify#token" className="text-gray-950 underline font-medium">How to find the token</Link></p>
                <ResultForm action={connectShopifyWithToken} submitLabel="Connect" pendingLabel="Connecting and importing…">
                  <Field label="Store address"><input name="shop" required placeholder="yourstore.myshopify.com" className={inputCls} /></Field>
                  <Field label="Admin API access token"><input name="token" required type="password" placeholder="shpat_…" className={inputCls} autoComplete="off" /></Field>
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
              <div className="px-5 pb-5 text-sm flex-1 space-y-3">
                {info.note && <p className="text-gray-500">{info.note}</p>}
                <Link href={`/app/help/${c.toLowerCase()}`} className="inline-flex items-center gap-1 text-xs font-medium text-gray-950 underline">Where do I get these details?</Link>
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
                      <Field key={f.key} label={`${f.label}${f.optional ? " (optional)" : ""}`}>
                        <input name={f.key} type={f.secret ? "password" : "text"} required={!f.optional} placeholder={f.placeholder} autoComplete="off" className={inputCls} />
                      </Field>
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
