import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchStageOrders } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "@/components/retail-cod-v2/PageHeader";
import OrdersTable from "@/components/retail-cod-v2/OrdersTable";

export default async function PackedDispatchOrdersV2Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const orders = await fetchStageOrders("PACKED_DISPATCH");

  return (
    <div className="space-y-6">
      <PageHeader active="/retail-cod-new/packed-dispatch" title="Packed & Ready to Dispatch" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} boxed up and waiting for courier pickup`} />
      <OrdersTable orders={orders} showStageColumn={false} />
    </div>
  );
}
