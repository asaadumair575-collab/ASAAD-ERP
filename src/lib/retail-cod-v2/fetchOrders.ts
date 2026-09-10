import { prisma } from "@/lib/prisma";
import { ecomOrderLabel } from "@/lib/ecomOrderLabel";
import type { OrderRow } from "@/components/retail-cod-v2/OrdersTable";
import { STAGES } from "./stages";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 30;

export type FetchOrdersParams = {
  stage?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  /** Actionable queues (Pending/Confirmed/Hold/Ready to Pack) default to
   * oldest-first so whoever's working the queue clears the longest-waiting
   * orders first, instead of newest-first burying them. */
  oldestFirst?: boolean;
};

export type FetchOrdersResult = {
  orders: OrderRow[];
  totalCount: number;
  totalValue: number;
  totalPages: number;
  currentPage: number;
};

function buildWhere({ stage, q, from, to }: FetchOrdersParams): Prisma.EcomOrderWhereInput {
  const fromDate = from ? new Date(`${from}T00:00:00+05:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59+05:00`) : undefined;
  return {
    ...(stage ? { stage } : {}),
    ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { city: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function fetchStageOrders(params: FetchOrdersParams): Promise<FetchOrdersResult> {
  const currentPage = Math.max(1, params.page ?? 1);
  const where = buildWhere(params);

  const [orders, totalCount, valueAgg] = await Promise.all([
    prisma.ecomOrder.findMany({
      where,
      include: { items: true },
      orderBy: params.oldestFirst ? { stageUpdatedAt: "asc" } : { date: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.ecomOrder.count({ where }),
    prisma.ecomOrder.aggregate({ where, _sum: { totalAmount: true } }),
  ]);

  return {
    orders: orders.map((o) => ({
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
      stageUpdatedAt: o.stageUpdatedAt.toISOString(),
    })),
    totalCount,
    totalValue: valueAgg._sum.totalAmount ?? 0,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    currentPage,
  };
}

export async function fetchStageCounts(): Promise<Record<string, { count: number; value: number }>> {
  const grouped = await prisma.ecomOrder.groupBy({ by: ["stage"], _count: { _all: true }, _sum: { totalAmount: true } });
  const counts: Record<string, { count: number; value: number }> = {};
  for (const s of STAGES) counts[s] = { count: 0, value: 0 };
  for (const g of grouped) counts[g.stage] = { count: g._count._all, value: g._sum.totalAmount ?? 0 };
  return counts;
}

export { PAGE_SIZE };
