import { prisma } from "@/lib/prisma";
import DispatchTabs from "@/components/DispatchTabs";
import DispatchTable from "@/components/DispatchTable";

export default async function DispatchedPage() {
  const orders = await prisma.order.findMany({
    where: { confirmed: true, dispatched: true },
    include: { client: true },
    orderBy: { dispatchedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dispatch</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orders.length} dispatched
        </p>
      </div>

      <DispatchTabs active="dispatched" />

      <DispatchTable orders={orders} />
    </div>
  );
}
