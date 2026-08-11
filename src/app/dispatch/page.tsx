import { prisma } from "@/lib/prisma";
import DispatchTabs from "@/components/DispatchTabs";
import DispatchTable from "@/components/DispatchTable";
import DispatchTypeSelect from "@/components/DispatchTypeSelect";
import CommissionDispatchTable from "@/components/CommissionDispatchTable";

export default async function DispatchPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeRaw } = await searchParams;
  const type = typeRaw === "commission" ? "commission" : "client";

  if (type === "commission") {
    const commissionOrders = await prisma.commissionOrder.findMany({
      where: { dispatched: false },
      orderBy: { date: "desc" },
    });

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {commissionOrders.length} pending commission order
              {commissionOrders.length === 1 ? "" : "s"}
            </p>
          </div>
          <DispatchTypeSelect type={type} />
        </div>

        <DispatchTabs active="pending" type="commission" />

        <CommissionDispatchTable orders={commissionOrders} />
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { confirmed: true, dispatched: false },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dispatch</h1>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} pending dispatch{orders.length === 1 ? "" : "es"}
          </p>
        </div>
        <DispatchTypeSelect type={type} />
      </div>

      <DispatchTabs active="pending" />

      <DispatchTable orders={orders} />
    </div>
  );
}
