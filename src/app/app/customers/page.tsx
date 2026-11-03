import { Badge, Card, Empty, PageHeader, Stat, Table, Tabs, Td, Th, inputCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, money, whatsappLink } from "@/lib/format";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "repeat" || sp.view === "risky" ? sp.view : "all";
  const q = (sp.q ?? "").trim().toLowerCase();

  // Customers grouped by phone number — that's how couriers and COD identify a buyer.
  const orders = await db.order.findMany({
    where: { tenantId: user.tenantId, phone: { not: null } },
    select: { phone: true, customerName: true, city: true, status: true, total: true, placedAt: true },
    orderBy: { placedAt: "desc" },
  });
  const map = new Map<string, { phone: string; name: string; city: string | null; orders: number; delivered: number; returned: number; spent: number; last: Date }>();
  for (const o of orders) {
    const c = map.get(o.phone!) ?? { phone: o.phone!, name: o.customerName, city: o.city, orders: 0, delivered: 0, returned: 0, spent: 0, last: o.placedAt };
    if (o.status !== "CANCELLED") c.orders++;
    if (o.status === "DELIVERED") { c.delivered++; c.spent += o.total; }
    if (o.status === "RETURNED") c.returned++;
    map.set(o.phone!, c);
  }
  const all = [...map.values()];
  const risky = (c: (typeof all)[number]) => c.returned > 0 && c.returned >= c.delivered;
  const list = all
    .filter((c) => (view === "repeat" ? c.orders > 1 : view === "risky" ? risky(c) : true))
    .filter((c) => !q || `${c.name} ${c.phone} ${c.city ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => b.spent - a.spent);
  const repeat = all.filter((c) => c.orders > 1).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Every buyer, identified by phone number, with their delivery history." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Customers" value={all.length.toLocaleString()} />
        <Stat label="Repeat customers" value={repeat} hint={all.length ? `${((repeat / all.length) * 100).toFixed(1)}% came back` : undefined} tone="good" />
        <Stat label="Risky (returns ≥ deliveries)" value={all.filter(risky).length} tone="bad" />
        <Stat label="Avg. spend per customer" value={money(all.length ? all.reduce((s, c) => s + c.spent, 0) / all.length : 0)} />
      </div>
      <div>
        <Tabs active={view} tabs={[
          { key: "all", label: "All", href: "/app/customers" },
          { key: "repeat", label: "Repeat", href: "/app/customers?view=repeat" },
          { key: "risky", label: "Risky", href: "/app/customers?view=risky" },
        ]} />
        <Card>
          <form className="p-3 border-b border-gray-200 flex gap-2">
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, phone or city" className={`${inputCls} max-w-xs`} />
            <button className="h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Search</button>
          </form>
          {list.length === 0 ? <Empty title="No customers found" /> : (
            <Table>
              <thead><tr><Th>Customer</Th><Th>City</Th><Th right>Orders</Th><Th right>Delivered</Th><Th right>Returned</Th><Th right>Spent</Th><Th>Last order</Th></tr></thead>
              <tbody>
                {list.slice(0, 300).map((c) => {
                  const wa = whatsappLink(c.phone, `Hi ${c.name}, `);
                  return (
                    <tr key={c.phone} className="hover:bg-gray-50">
                      <Td>
                        <div className="font-medium text-gray-900">{c.name} {risky(c) && <Badge className="bg-red-50 text-red-700 ring-red-200">Risky</Badge>}</div>
                        <div className="text-xs text-gray-500">{wa ? <a href={wa} target="_blank" rel="noreferrer" className="hover:underline">{c.phone}</a> : c.phone}</div>
                      </Td>
                      <Td className="text-gray-600">{c.city ?? "—"}</Td>
                      <Td right>{c.orders}</Td>
                      <Td right>{c.delivered}</Td>
                      <Td right className={c.returned ? "text-red-600" : "text-gray-400"}>{c.returned}</Td>
                      <Td right>{money(c.spent)}</Td>
                      <Td className="text-gray-500">{fmtDate(c.last)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
