import { AlertTriangle, Boxes, Layers, Wallet } from "lucide-react";
import { Badge, Card, CardHeader, Empty, PageHeader, Stat, Table, Tabs, Td, Th, btn, inputCls } from "@/components/ui";

const numCls = inputCls.replace("w-full ", "");
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, daysAgo } from "@/lib/format";
import { createProduct, updateProduct } from "../actions";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = sp.filter === "low" ? "low" : "all";
  const q = (sp.q ?? "").trim().toLowerCase();
  const since = daysAgo(30);

  const [products, sold, hasShopify] = await Promise.all([
    db.product.findMany({ where: { tenantId: user.tenantId }, orderBy: { title: "asc" } }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { tenantId: user.tenantId, placedAt: { gte: since }, status: { not: "CANCELLED" } }, productId: { not: null } },
      _sum: { qty: true },
    }),
    db.shopifyConnection.count({ where: { tenantId: user.tenantId } }),
  ]);
  const soldBy = new Map(sold.map((s) => [s.productId, s._sum.qty ?? 0]));
  const rows = products
    .map((p) => {
      const s = soldBy.get(p.id) ?? 0;
      const perDay = s / 30;
      return { ...p, sold: s, daysLeft: perDay ? Math.floor(p.stock / perDay) : null };
    })
    .filter((p) => (filter === "low" ? p.stock <= p.lowStockAt : true))
    .filter((p) => !q || `${p.title} ${p.variantTitle ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => b.sold - a.sold);
  const low = products.filter((p) => p.stock <= p.lowStockAt).length;
  const stockValue = products.reduce((s, p) => s + p.stock * (p.cost ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description={hasShopify ? "Products and stock sync from Shopify. Add your cost price to see real profit." : "Add your products to track stock and profit."} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Boxes} chip="blue" label="Products" value={products.length} />
        <Stat icon={Layers} chip="green" label="Units in stock" value={products.reduce((s, p) => s + p.stock, 0).toLocaleString()} />
        <Stat icon={AlertTriangle} chip="amber" label="Low or out of stock" value={low} tone={low ? "warn" : undefined} />
        <Stat icon={Wallet} label="Stock value (at cost)" value={money(stockValue)} hint={products.some((p) => p.cost == null) ? "Some products have no cost" : undefined} />
      </div>

      <div>
        <Tabs active={filter} tabs={[{ key: "all", label: "All products", href: "/app/inventory" }, { key: "low", label: "Low stock", count: low, href: "/app/inventory?filter=low" }]} />
        <Card>
          <form className="p-3 border-b border-gray-200 flex gap-2">
            {filter === "low" && <input type="hidden" name="filter" value="low" />}
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Search product or SKU" className={`${inputCls} max-w-xs`} />
            <button className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50">Search</button>
          </form>
          {rows.length === 0 ? (
            <Empty title="No products">{hasShopify ? "Products appear after the next Shopify sync." : "Connect Shopify or add a product below."}</Empty>
          ) : (
            <Table>
              <thead><tr><Th>Product</Th><Th>SKU</Th><Th right>Price</Th><Th right>Sold (30d)</Th><Th>Stock</Th><Th right>Edit</Th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <Td>
                      <div className="font-medium text-gray-900">{p.title}</div>
                      {p.variantTitle && <div className="text-xs text-gray-500">{p.variantTitle}</div>}
                    </Td>
                    <Td className="font-mono text-xs text-gray-500">{p.sku ?? "—"}</Td>
                    <Td right>{money(p.price)}</Td>
                    <Td right>{p.sold}</Td>
                    <Td>
                      {p.stock <= 0 ? <Badge className="bg-red-50 text-red-700 ring-red-200">Out of stock</Badge>
                        : p.stock <= p.lowStockAt ? <Badge className="bg-amber-50 text-amber-700 ring-amber-200">{p.stock} left</Badge>
                        : <span className="tabular-nums">{p.stock}</span>}
                      {p.daysLeft !== null && p.stock > 0 && p.daysLeft <= 14 && <div className="text-xs text-gray-500 mt-0.5">~{p.daysLeft} days of stock</div>}
                    </Td>
                    <Td>
                      <form action={updateProduct.bind(null, p.id)} className="flex items-end gap-1.5 justify-end">
                        <label className="text-[11px] text-gray-500">Cost
                          <input name="cost" type="number" min={0} step="any" defaultValue={p.cost ?? ""} placeholder="—" className={`${numCls} h-8 w-20 text-xs block mt-0.5`} />
                        </label>
                        {!p.shopifyVariantId && (
                          <label className="text-[11px] text-gray-500">Stock
                            <input name="stock" type="number" defaultValue={p.stock} className={`${numCls} h-8 w-16 text-xs block mt-0.5`} />
                          </label>
                        )}
                        <label className="text-[11px] text-gray-500" title="Show a low-stock alert at or below this quantity">Alert at
                          <input name="lowStockAt" type="number" min={0} defaultValue={p.lowStockAt} className={`${numCls} h-8 w-16 text-xs block mt-0.5`} />
                        </label>
                        <button className={btn("secondary", "sm")}>Save</button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Add product" />
        <form action={createProduct} className="p-4 grid sm:grid-cols-5 gap-3 items-end">
          <input name="title" required placeholder="Product name" className={`${inputCls} sm:col-span-2`} />
          <input name="sku" placeholder="SKU" className={inputCls} />
          <input name="price" type="number" min={0} placeholder="Price" className={inputCls} />
          <input name="cost" type="number" min={0} placeholder="Cost" className={inputCls} />
          <input name="stock" type="number" min={0} placeholder="Stock" className={inputCls} />
          <button className={btn("primary")}>Add product</button>
        </form>
      </Card>
    </div>
  );
}
