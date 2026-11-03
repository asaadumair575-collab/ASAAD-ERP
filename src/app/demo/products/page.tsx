"use client";

import { useMemo } from "react";
import { useDemo, useOrderRows } from "@/lib/demo/store";
import { Card, Kpi, PageHeader, Td, Th, money, isoDaysAgo } from "../_components/ui";

export default function ProductsPage() {
  const products = useDemo((s) => s.products);
  const rows = useOrderRows();

  const list = useMemo(() => {
    const since = isoDaysAgo(30);
    return products.map((p) => {
      let sold = 0;
      let returned = 0;
      for (const r of rows) {
        if (r.createdAt < since || r.status === "Cancelled") continue;
        for (const i of r.items) if (i.productId === p.id) {
          sold += i.qty;
          if (r.status === "Returned") returned += i.qty;
        }
      }
      const perDay = sold / 30;
      return { ...p, sold, returned, daysLeft: perDay ? Math.floor(p.stock / perDay) : Infinity };
    });
  }, [products, rows]);

  const low = list.filter((p) => p.daysLeft <= 7);
  const value = list.reduce((s, p) => s + p.stock * p.cost, 0);

  return (
    <div>
      <PageHeader title="Products & Inventory" subtitle="Stock syncs with Shopify — sold items are deducted automatically." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi tone="blue" icon={<path d="M10 2 3 5.5v9L10 18l7-3.5v-9L10 2z" />} label="Active products" value={products.length} />
        <Kpi tone="green" icon={<path d="M3 14l4.5-4.5 3 3L17 6" />} label="Units sold (30d)" value={list.reduce((s, p) => s + p.sold, 0).toLocaleString()} />
        <Kpi tone="orange" icon={<path d="M10 3l8 14H2L10 3zM10 8v4" />} label="Low / out of stock" value={low.length} note="restock soon" />
        <Kpi tone="violet" icon={<path d="M2 5h16v10H2zM2 8h16" />} label="Stock value (cost)" value={money(value)} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFBFC] border-b border-gray-100">
              <tr><Th>Product</Th><Th>SKU</Th><Th right>Price</Th><Th right>Stock</Th><Th right>Sold (30d)</Th><Th right>Return rate</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...list].sort((a, b) => b.sold - a.sold).map((p) => (
                <tr key={p.id} className={p.stock === 0 ? "bg-red-50/30" : ""}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">{p.emoji}</span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </Td>
                  <Td className="text-gray-500 font-mono text-xs">{p.sku}</Td>
                  <Td right>{money(p.price)}</Td>
                  <Td right className={`font-semibold ${p.stock === 0 ? "text-red-600" : p.daysLeft <= 7 ? "text-[#D9480F]" : ""}`}>{p.stock}</Td>
                  <Td right>{p.sold}</Td>
                  <Td right className="text-gray-500">{p.sold ? ((p.returned / p.sold) * 100).toFixed(1) : "0.0"}%</Td>
                  <Td>
                    {p.stock === 0 ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">Out of stock</span>
                    ) : p.daysLeft <= 7 ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Low · ~{p.daysLeft}d left</span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">In stock</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
