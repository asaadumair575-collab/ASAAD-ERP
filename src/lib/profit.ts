import { db } from "./db";

// Real profit for a period: delivered sales minus product cost, courier
// charges, the charges lost on returned parcels, and the store's expenses.
export async function profitSummary(tenantId: number, since: Date) {
  const [delivered, returned, expenses] = await Promise.all([
    db.order.findMany({
      where: { tenantId, status: "DELIVERED", placedAt: { gte: since } },
      select: { total: true, shipment: { select: { courierCharge: true } }, items: { select: { qty: true, product: { select: { cost: true } } } } },
    }),
    db.shipment.aggregate({ where: { tenantId, status: "RETURNED", bookedAt: { gte: since } }, _sum: { courierCharge: true }, _count: true }),
    db.expense.aggregate({ where: { tenantId, date: { gte: since } }, _sum: { amount: true } }),
  ]);
  const revenue = delivered.reduce((a, o) => a + o.total, 0);
  const productCost = delivered.reduce((a, o) => a + o.items.reduce((s, i) => s + i.qty * (i.product?.cost ?? 0), 0), 0);
  const missingCost = delivered.some((o) => o.items.some((i) => i.product?.cost == null));
  const shipping = delivered.reduce((a, o) => a + (o.shipment?.courierCharge ?? 0), 0);
  const returnLoss = returned._sum.courierCharge ?? 0;
  const expenseTotal = expenses._sum.amount ?? 0;
  const gross = revenue - productCost - shipping - returnLoss;
  return {
    deliveredCount: delivered.length,
    revenue, productCost, shipping, returnLoss, returnedCount: returned._count,
    expenses: expenseTotal, gross, net: gross - expenseTotal, missingCost,
  };
}
