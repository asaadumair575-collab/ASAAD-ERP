import { Download, Repeat, ShieldAlert, Users, Wallet } from "lucide-react";
import BlockButton from "@/components/BlockButton";
import ResultForm from "@/components/ResultForm";
import { Badge, Card, Empty, PageHeader, Stat, Table, Tabs, Td, Th, btn, inputCls } from "@/components/ui";
import { blockPhoneForm } from "../actions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, money, whatsappLink } from "@/lib/format";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "repeat" || sp.view === "risky" || sp.view === "blocked" ? sp.view : "all";
  const q = (sp.q ?? "").trim().toLowerCase();

  // Customers grouped by phone number — that's how couriers and COD identify a buyer.
  const [orders, blockedList] = await Promise.all([
    db.order.findMany({
      where: { tenantId: user.tenantId, phone: { not: null } },
      select: { phone: true, customerName: true, city: true, status: true, total: true, placedAt: true },
      orderBy: { placedAt: "desc" },
    }),
    db.blockedPhone.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } }),
  ]);
  const blocked = new Set(blockedList.map((b) => b.phone));
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
      <PageHeader
        title="Customers"
        description="Every buyer, identified by phone number, with their delivery history."
        actions={<a href="/app/customers/export" className={btn("secondary")}><Download className="w-4 h-4" />Export</a>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} chip="blue" label="Customers" value={all.length.toLocaleString()} />
        <Stat icon={Repeat} chip="green" label="Repeat customers" value={repeat} hint={all.length ? `${((repeat / all.length) * 100).toFixed(1)}% came back` : undefined} tone="good" />
        <Stat icon={ShieldAlert} chip="red" label="Risky (returns ≥ deliveries)" value={all.filter(risky).length} hint={`${blockedList.length} blocked`} tone="bad" />
        <Stat icon={Wallet} label="Avg. spend per customer" value={money(all.length ? all.reduce((s, c) => s + c.spent, 0) / all.length : 0)} />
      </div>
      <div>
        <Tabs active={view} tabs={[
          { key: "all", label: "All", href: "/app/customers" },
          { key: "repeat", label: "Repeat", href: "/app/customers?view=repeat" },
          { key: "risky", label: "Risky", href: "/app/customers?view=risky" },
          { key: "blocked", label: "Blocked numbers", count: blockedList.length, href: "/app/customers?view=blocked" },
        ]} />
        {view === "blocked" ? (
          <Card>
            <div className="p-5 border-b border-gray-100">
              <p className="text-sm text-gray-600 mb-3">Orders from these numbers are flagged in red and can&apos;t be booked — stops fake orders and repeat refusers from costing you delivery charges.</p>
              <ResultForm action={blockPhoneForm} submitLabel="Block number" className="flex flex-wrap gap-2 items-center">
                <input name="phone" required placeholder="03001234567" className={`${inputCls} max-w-48`} />
                <input name="reason" placeholder="Reason (optional)" className={`${inputCls} max-w-64`} />
              </ResultForm>
            </div>
            {blockedList.length === 0 ? <Empty title="No blocked numbers">Block a number from here or from any order page.</Empty> : (
              <Table>
                <thead><tr><Th>Phone</Th><Th>Reason</Th><Th>Blocked by</Th><Th>Date</Th><Th /></tr></thead>
                <tbody>
                  {blockedList.map((b) => (
                    <tr key={b.id}>
                      <Td className="font-medium">{b.phone}</Td>
                      <Td className="text-gray-600">{b.reason ?? "—"}</Td>
                      <Td className="text-gray-500">{b.by ?? "—"}</Td>
                      <Td className="text-gray-500">{fmtDate(b.createdAt)}</Td>
                      <Td right><BlockButton phone={b.phone} blocked /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        ) : (
        <Card>
          <form className="p-4 flex gap-2">
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, phone or city" className={`${inputCls} max-w-xs`} />
            <button className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50">Search</button>
          </form>
          {list.length === 0 ? <Empty title="No customers found" /> : (
            <Table>
              <thead><tr><Th>Customer</Th><Th>City</Th><Th right>Orders</Th><Th right>Delivered</Th><Th right>Returned</Th><Th right>Spent</Th><Th>Last order</Th><Th /></tr></thead>
              <tbody>
                {list.slice(0, 300).map((c) => {
                  const wa = whatsappLink(c.phone, `Hi ${c.name}, `);
                  return (
                    <tr key={c.phone} className="hover:bg-gray-50">
                      <Td>
                        <div className="font-medium text-gray-900">{c.name} {blocked.has(c.phone) ? <Badge className="bg-red-600 text-white">Blocked</Badge> : risky(c) && <Badge className="bg-red-50 text-red-700">Risky</Badge>}</div>
                        <div className="text-xs text-gray-500">{wa ? <a href={wa} target="_blank" rel="noreferrer" className="hover:underline">{c.phone}</a> : c.phone}</div>
                      </Td>
                      <Td className="text-gray-600">{c.city ?? "—"}</Td>
                      <Td right>{c.orders}</Td>
                      <Td right>{c.delivered}</Td>
                      <Td right className={c.returned ? "text-red-600" : "text-gray-400"}>{c.returned}</Td>
                      <Td right>{money(c.spent)}</Td>
                      <Td className="text-gray-500">{fmtDate(c.last)}</Td>
                      <Td right><BlockButton phone={c.phone} blocked={blocked.has(c.phone)} /></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        )}
      </div>
    </div>
  );
}
