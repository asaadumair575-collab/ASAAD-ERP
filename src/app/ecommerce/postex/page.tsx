import { prisma } from "@/lib/prisma";
import PostExChecker from "@/components/PostExChecker";
import { toggleEcomOrderReturned } from "@/lib/actions";

export default async function PostExPage() {
  const orders = await prisma.ecomOrder.findMany({
    where: { trackingNumber: { not: null }, returned: false },
    orderBy: { date: "desc" },
    select: { id: true, customerName: true, trackingNumber: true, totalAmount: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">PostEx Status Check</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pending orders ke status check karo — jo return ho unko mark karo</p>
      </div>
      <PostExChecker orders={orders} markReturnedAction={toggleEcomOrderReturned} />
    </div>
  );
}
