import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.retailOrder.findMany({
    where: { status: "DELIVERED", payments: { some: { note: "CPR settlement" } } },
    include: { payments: { where: { note: "CPR settlement" } } },
  });

  const results = [];
  for (const o of orders) {
    const netAmount = o.payments[0]?.amount ?? 0;
    const correctCharge = Math.round((o.totalAmount - netAmount) * 100) / 100;
    await prisma.retailOrder.update({ where: { id: o.id }, data: { courierCharge: correctCharge } });
    results.push({ id: o.id, cod: o.totalAmount, net: netAmount, oldCharge: o.courierCharge, newCharge: correctCharge });
  }

  return NextResponse.json({ fixed: results.length, results });
}
