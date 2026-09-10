import { prisma } from "@/lib/prisma";
import { ecomOrderLabel } from "@/lib/ecomOrderLabel";
import type { OrderRow } from "@/components/retail-cod-v2/OrdersTable";
import { STAGES } from "./stages";

export async function fetchStageOrders(stage?: string): Promise<OrderRow[]> {
  const orders = await prisma.ecomOrder.findMany({
    where: stage ? { stage } : {},
    include: { items: true },
    orderBy: { date: "desc" },
    take: 300,
  });
  return orders.map((o) => ({
    id: o.id,
    orderLabel: ecomOrderLabel(o),
    customerName: o.customerName,
    phone: o.phone,
    city: o.city,
    totalAmount: o.totalAmount,
    date: o.date.toLocaleDateString("en-PK", { day: "numeric", month: "short" }),
    items: o.items.map((i) => `${i.description} ×${i.quantity}`).join(", "),
    trackingNumber: o.trackingNumber,
    stage: o.stage,
  }));
}

export async function fetchStageCounts(): Promise<Record<string, number>> {
  const grouped = await prisma.ecomOrder.groupBy({ by: ["stage"], _count: { _all: true } });
  const counts: Record<string, number> = {};
  for (const s of STAGES) counts[s] = 0;
  for (const g of grouped) counts[g.stage] = g._count._all;
  return counts;
}
