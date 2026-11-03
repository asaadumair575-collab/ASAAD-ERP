import { AlertTriangle, PackageCheck, Truck, Undo2 } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import ActionButton from "@/components/ActionButton";
import { Badge, Card, Empty, PageHeader, Stat, Table, Tabs, Td, Th, inputCls, selectCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { SHIPMENT_STATUS, fmtDate, money, daysAgo } from "@/lib/format";
import { refreshShipments } from "../actions";

const OPEN = ["BOOKED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] as const;
const TABS = { transit: "In transit", stuck: "Stuck 5+ days", DELIVERED: "Delivered", RETURNED: "Returned", all: "All" } as const;

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ filter?: string; courier?: string; q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = (Object.keys(TABS) as string[]).includes(sp.filter ?? "") ? (sp.filter as keyof typeof TABS) : "transit";
  const q = (sp.q ?? "").trim();
  const fiveDaysAgo = daysAgo(5);

  const base: Prisma.ShipmentWhereInput = { tenantId: user.tenantId, ...(sp.courier ? { courier: sp.courier as never } : {}) };
  const byFilter: Record<keyof typeof TABS, Prisma.ShipmentWhereInput> = {
    transit: { status: { in: [...OPEN] } },
    stuck: { status: { in: [...OPEN] }, bookedAt: { lt: fiveDaysAgo } },
    DELIVERED: { status: "DELIVERED" },
    RETURNED: { status: "RETURNED" },
    all: {},
  };
  const where: Prisma.ShipmentWhereInput = {
    ...base,
    ...byFilter[filter],
    ...(q ? { OR: [{ trackingNumber: { contains: q } }, { order: { number: { contains: q, mode: "insensitive" } } }, { order: { customerName: { contains: q, mode: "insensitive" } } }] } : {}),
  };

  const [rows, counts, stuck, couriers] = await Promise.all([
    db.shipment.findMany({ where, orderBy: { bookedAt: "desc" }, take: 200, include: { order: { select: { id: true, number: true, customerName: true, city: true } } } }),
    db.shipment.groupBy({ by: ["status"], where: base, _count: true, _sum: { codAmount: true } }),
    db.shipment.count({ where: { ...base, ...byFilter.stuck } }),
    db.shipment.findMany({ where: { tenantId: user.tenantId }, distinct: ["courier"], select: { courier: true } }),
  ]);
  const n = (statuses: readonly string[]) => counts.filter((c) => statuses.includes(c.status)).reduce((a, c) => a + c._count, 0);
  const codOpen = counts.filter((c) => (OPEN as readonly string[]).includes(c.status)).reduce((a, c) => a + (c._sum.codAmount ?? 0), 0);
  const delivered = n(["DELIVERED"]);
  const returned = n(["RETURNED"]);
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ filter, courier: sp.courier, ...patch })) if (v) p.set(k, v);
    return `/app/shipments?${p}`;
  };

  return (
    <div>
      <PageHeader
        title="Shipments"
        description="Every parcel you booked, with live status from the courier."
        actions={<ActionButton action={refreshShipments.bind(null, undefined)} label="Refresh tracking" pendingLabel="Checking couriers…" />}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Truck} chip="blue" label="In transit" value={n(OPEN)} hint={`${money(codOpen)} COD on the way`} />
        <Stat icon={PackageCheck} chip="green" label="Delivered" value={delivered} />
        <Stat icon={Undo2} chip="red" label="Returned" value={returned} hint={delivered + returned ? `${((returned / (delivered + returned)) * 100).toFixed(1)}% return rate` : undefined} tone={returned ? "bad" : undefined} />
        <Stat icon={AlertTriangle} chip="amber" label="Stuck 5+ days" value={stuck} tone={stuck ? "warn" : undefined} hint={stuck ? "Follow up with the courier" : "All moving"} />
      </div>

      <Tabs active={filter} tabs={(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => ({ key: k, label: TABS[k], href: link({ filter: k }) }))} />
      <Card>
        <form className="p-3 border-b border-gray-200 flex flex-wrap gap-2">
          <input type="hidden" name="filter" value={filter} />
          <select name="courier" defaultValue={sp.courier ?? ""} className={`${selectCls}`}>
            <option value="">All couriers</option>
            {couriers.map((c) => <option key={c.courier} value={c.courier}>{courierName(c.courier)}</option>)}
          </select>
          <input name="q" defaultValue={q} placeholder="Tracking number, order # or name" className={`${inputCls} max-w-xs`} />
          <button className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50">Filter</button>
        </form>
        {rows.length === 0 ? (
          <Empty title="No parcels here" />
        ) : (
          <Table>
            <thead><tr><Th>Tracking</Th><Th>Order</Th><Th>Customer</Th><Th>Courier</Th><Th>Booked</Th><Th right>Days</Th><Th right>COD</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const days = Math.floor(((s.deliveredAt ?? s.returnedAt ?? new Date()).getTime() - s.bookedAt.getTime()) / 86400000);
                const late = (OPEN as readonly string[]).includes(s.status) && days >= 5;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td className="font-mono text-xs">{s.trackingNumber}</Td>
                    <Td><Link href={`/app/orders/${s.order.id}`} className="font-medium hover:underline">{s.order.number}</Link></Td>
                    <Td>{s.order.customerName}<div className="text-xs text-gray-500">{s.order.city}</div></Td>
                    <Td className="text-gray-600">{courierName(s.courier)}</Td>
                    <Td className="text-gray-500 whitespace-nowrap">{fmtDate(s.bookedAt)}</Td>
                    <Td right className={late ? "text-red-600 font-medium" : "text-gray-600"}>{days}</Td>
                    <Td right>{s.codAmount ? money(s.codAmount) : <span className="text-gray-400">Prepaid</span>}</Td>
                    <Td>
                      <Badge className={SHIPMENT_STATUS[s.status].cls}>{SHIPMENT_STATUS[s.status].label}</Badge>
                      {s.courierStatus && s.courierStatus !== SHIPMENT_STATUS[s.status].label && <div className="text-xs text-gray-500 mt-0.5 max-w-[180px] truncate">{s.courierStatus}</div>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
