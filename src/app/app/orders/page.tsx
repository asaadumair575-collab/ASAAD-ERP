import type { Prisma } from "@/generated/prisma/client";
import OrdersTable from "@/components/OrdersTable";
import { Download, Plus, Upload } from "lucide-react";
import { Card, Empty, LinkButton, PageHeader, Tabs, btn, inputCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { ORDER_STATUS, fmtDateTime, money } from "@/lib/format";
import { connectedCouriers } from "@/lib/shipping";

const PAGE = 50;
const TABS = ["ALL", "NEW", "CONFIRMED", "BOOKED", "IN_TRANSIT", "DELIVERED", "RETURNED", "CANCELLED"] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = (TABS as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof TABS)[number]) : "ALL";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.OrderWhereInput = {
    tenantId: user.tenantId,
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { city: { contains: q, mode: "insensitive" } },
            { shipment: { trackingNumber: { contains: q } } },
          ],
        }
      : {}),
  };

  const [orders, total, counts, couriers] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { shipment: { select: { courier: true, trackingNumber: true } }, items: { select: { qty: true } } },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: { tenantId: user.tenantId }, _count: true }),
    connectedCouriers(user.tenantId, user.tenant.isDemo),
  ]);

  // Customers whose earlier parcels came back — shown as a warning before booking.
  const phones = [...new Set(orders.map((o) => o.phone).filter((p): p is string => Boolean(p)))];
  const returns = phones.length
    ? await db.order.groupBy({ by: ["phone"], where: { tenantId: user.tenantId, phone: { in: phones }, status: "RETURNED" }, _count: true })
    : [];
  const returnsBy = new Map(returns.map((r) => [r.phone, r._count]));
  const blocked = new Set(
    phones.length ? (await db.blockedPhone.findMany({ where: { tenantId: user.tenantId, phone: { in: phones } }, select: { phone: true } })).map((b) => b.phone) : [],
  );

  const countOf = (s: string) => (s === "ALL" ? counts.reduce((a, c) => a + c._count, 0) : counts.find((c) => c.status === s)?._count ?? 0);
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: status === "ALL" ? undefined : status, q: q || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/app/orders${p.size ? `?${p}` : ""}`;
  };
  const pages = Math.ceil(total / PAGE);

  return (
    <div>
      <PageHeader title="Orders" description="Shopify orders arrive automatically. Select orders to confirm, book with a courier or print slips." actions={
          <>
            <a href={`/app/orders/export${status !== "ALL" ? `?status=${status}` : ""}`} className={btn("secondary")}><Download className="w-4 h-4" />Export</a>
            <LinkButton href="/app/orders/import" variant="secondary"><Upload className="w-4 h-4" />Import CSV</LinkButton>
            <LinkButton href="/app/orders/new"><Plus className="w-4 h-4" />New order</LinkButton>
          </>
        } />
      <Tabs
        active={status}
        tabs={TABS.map((s) => ({ key: s, label: s === "ALL" ? "All" : ORDER_STATUS[s].label, count: countOf(s), href: link({ status: s === "ALL" ? undefined : s, page: undefined }) }))}
      />
      <Card>
        <form className="p-4 flex gap-2">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search order #, name, phone, city or tracking" className={`${inputCls} max-w-md`} />
          <button className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50">Search</button>
        </form>
        <OrdersTable
          empty={<Empty title="No orders here">{q ? "Try a different search." : "New Shopify orders will show up automatically."}</Empty>}
          couriers={couriers.map((c) => ({ value: c, label: courierName(c) }))}
          rows={orders.map((o) => ({
            id: o.id,
            number: o.number,
            placedAt: fmtDateTime(o.placedAt),
            customerName: o.customerName,
            phone: o.phone,
            city: o.city,
            items: o.items.reduce((s, i) => s + i.qty, 0),
            total: money(o.total),
            payment: o.paymentMethod === "COD" ? "COD" : "Prepaid",
            status: o.status,
            statusLabel: ORDER_STATUS[o.status].label,
            statusCls: ORDER_STATUS[o.status].cls,
            courier: o.shipment ? courierName(o.shipment.courier) : null,
            tracking: o.shipment?.trackingNumber ?? null,
            returns: o.phone ? returnsBy.get(o.phone) ?? 0 : 0,
            blocked: o.phone ? blocked.has(o.phone) : false,
          }))}
        />
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-500">
            <span>Page {page} of {pages} · {total} orders</span>
            <div className="flex gap-2">
              {page > 1 && <LinkButton size="sm" variant="secondary" href={link({ page: String(page - 1) })}>Previous</LinkButton>}
              {page < pages && <LinkButton size="sm" variant="secondary" href={link({ page: String(page + 1) })}>Next</LinkButton>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
