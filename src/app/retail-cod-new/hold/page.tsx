import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchStageOrders } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "@/components/retail-cod-v2/PageHeader";
import OrdersTable from "@/components/retail-cod-v2/OrdersTable";

export default async function HoldOrdersV2Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const orders = await fetchStageOrders("HOLD");

  return (
    <div className="space-y-6">
      <PageHeader active="/retail-cod-new/hold" title="Hold Orders" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} paused — needs a decision before moving on`} />
      <OrdersTable orders={orders} showStageColumn={false} />
    </div>
  );
}
