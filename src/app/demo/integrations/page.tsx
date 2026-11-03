"use client";

import { useState } from "react";
import { COURIERS, type Courier } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/store";
import { Button, Card, Field, Modal, PageHeader, inputCls, timeAgo } from "../_components/ui";

const COURIER_INFO: Record<Courier, { color: string; desc: string }> = {
  PostEx: { color: "bg-[#F15A24]", desc: "Book parcels, print airway bills, track and get COD reports." },
  TCS: { color: "bg-red-600", desc: "Nationwide delivery with live tracking and COD settlement." },
  Leopards: { color: "bg-yellow-500", desc: "Same-day booking, tracking updates and payment reports." },
};

export default function IntegrationsPage() {
  const integrations = useDemo((s) => s.integrations);
  const setCourierConnected = useDemo((s) => s.setCourierConnected);
  const setShopifyConnected = useDemo((s) => s.setShopifyConnected);
  const syncShopify = useDemo((s) => s.syncShopify);
  const toast = useDemo((s) => s.toast);
  const [connecting, setConnecting] = useState<Courier | "Shopify" | null>(null);
  const [busy, setBusy] = useState(false);
  const shopify = integrations.shopify;

  function finishConnect() {
    setBusy(true);
    setTimeout(() => {
      if (connecting === "Shopify") {
        setShopifyConnected(true);
        const n = syncShopify(3);
        toast(`Shopify connected — ${n} orders imported`);
      } else if (connecting) {
        setCourierConnected(connecting, true);
        toast(`${connecting} connected`);
      }
      setBusy(false);
      setConnecting(null);
    }, 1200);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" subtitle="Connect your store and couriers once — everything after that is automatic." />

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <span className="w-14 h-14 rounded-2xl bg-[#5E8E3E] text-white text-2xl font-bold flex items-center justify-center shrink-0">S</span>
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Shopify</h2>
              {shopify.connected ? (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">● Connected</span>
              ) : (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Not connected</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Orders, customers and products sync automatically. New orders appear here within seconds.</p>
            {shopify.connected && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
                <span><span className="text-gray-400">Store: </span><span className="font-medium">{shopify.store}</span></span>
                <span><span className="text-gray-400">Last sync: </span>{timeAgo(shopify.lastSync)}</span>
                <span><span className="text-gray-400">Auto-sync: </span>every minute</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {shopify.connected ? (
              <>
                <Button variant="secondary" onClick={() => { const n = syncShopify(); toast(`${n} new order${n === 1 ? "" : "s"} synced`); }}>Sync now</Button>
                <Button variant="secondary" onClick={() => setShopifyConnected(false)}>Disconnect</Button>
              </>
            ) : (
              <Button onClick={() => setConnecting("Shopify")}>Connect Shopify</Button>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Couriers</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {COURIERS.map((c) => {
            const on = integrations.couriers[c];
            return (
              <Card key={c} className="p-5 flex flex-col">
                <div className="flex items-center gap-3">
                  <span className={`w-11 h-11 rounded-xl ${COURIER_INFO[c].color} text-white font-bold flex items-center justify-center`}>{c[0]}</span>
                  <div>
                    <p className="font-semibold">{c}</p>
                    <p className={`text-xs font-semibold ${on ? "text-emerald-600" : "text-gray-400"}`}>{on ? "● Connected" : "Not connected"}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3 flex-1">{COURIER_INFO[c].desc}</p>
                <div className="mt-4">
                  {on ? (
                    <Button variant="secondary" onClick={() => setCourierConnected(c, false)}>Disconnect</Button>
                  ) : (
                    <Button onClick={() => setConnecting(c)}>Connect {c}</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold">How it works</h2>
        <ol className="mt-4 grid sm:grid-cols-4 gap-4 text-sm">
          {[
            ["1", "Order placed", "Customer orders on your Shopify store."],
            ["2", "Auto-synced", "Order appears here instantly with customer details."],
            ["3", "Confirm & book", "Confirm by call, book with a courier in one click."],
            ["4", "Track & collect", "Delivery, returns and COD payments update automatically."],
          ].map(([n, t, d]) => (
            <li key={n} className="rounded-xl bg-[#FAFBFC] p-4">
              <span className="w-7 h-7 rounded-full bg-[#F15A24] text-white text-xs font-bold flex items-center justify-center">{n}</span>
              <p className="font-semibold mt-3">{t}</p>
              <p className="text-gray-500 mt-1">{d}</p>
            </li>
          ))}
        </ol>
      </Card>

      {connecting && (
        <Modal title={`Connect ${connecting}`} onClose={() => !busy && setConnecting(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              finishConnect();
            }}
          >
            {connecting === "Shopify" ? (
              <Field label="Store URL"><input required className={inputCls} defaultValue="yourstore.myshopify.com" /></Field>
            ) : (
              <>
                <Field label="Account / merchant ID"><input required className={inputCls} placeholder="e.g. 102938" /></Field>
                <Field label="API key"><input required className={inputCls} placeholder="Paste the API key from your courier portal" /></Field>
              </>
            )}
            <p className="text-xs text-gray-400">This is a demo — any value works and nothing is sent anywhere.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConnecting(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Connecting…" : "Connect"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
