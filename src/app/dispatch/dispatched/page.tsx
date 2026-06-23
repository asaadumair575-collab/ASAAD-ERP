import { prisma } from "@/lib/prisma";
import DispatchTabs from "@/components/DispatchTabs";
import DispatchTable from "@/components/DispatchTable";
import DispatchTypeSelect from "@/components/DispatchTypeSelect";
import CommissionDispatchTable from "@/components/CommissionDispatchTable";

export default async function DispatchedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeRaw } = await searchParams;
  const type = typeRaw === "commission" ? "commission" : "client";

  if (type === "commission") {
    const commissionOrders = await prisma.commissionOrder.findMany({
      where: { dispatched: true },
      orderBy: { dispatchedAt: "desc" },
    });

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dispatch</h1>
            <p className="text-sm text-gray-500 mt-1">
              {commissionOrders.length} dispatched commission order
              {commissionOrders.length === 1 ? "" : "s"}
            </p>
          </div>
          <DispatchTypeSelect type={type} />
        </div>

        <DispatchTabs active="dispatched" type="commission" />

        <CommissionDispatchTable orders={commissionOrders} />
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { confirmed: true, dispatched: true },
    include: { client: true },
    orderBy: { dispatchedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dispatch</h1>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} dispatched
          </p>
        </div>
        <DispatchTypeSelect type="client" />
      </div>

      <DispatchTabs active="dispatched" />

      <DispatchTable orders={orders} />
    </div>
  );
}
