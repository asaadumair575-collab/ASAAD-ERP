import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchStageOrders } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "@/components/retail-cod-v2/PageHeader";
import OrdersTable from "@/components/retail-cod-v2/OrdersTable";

export default async function ReadyToPackOrdersV2Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const orders = await fetchStageOrders("READY_TO_PACK");

  return (
    <div className="space-y-6">
      <PageHeader active="/retail-cod-new/ready-to-pack" title="Ready to Pack" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} cleared for packing`} />
      <OrdersTable orders={orders} showStageColumn={false} />
    </div>
  );
}
