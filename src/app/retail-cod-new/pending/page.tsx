import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchStageOrders } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "@/components/retail-cod-v2/PageHeader";
import OrdersTable from "@/components/retail-cod-v2/OrdersTable";

export default async function PendingOrdersV2Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const orders = await fetchStageOrders("PENDING");

  return (
    <div className="space-y-6">
      <PageHeader active="/retail-cod-new/pending" title="Pending Orders" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} waiting on a first look`} />
      <OrdersTable orders={orders} showStageColumn={false} />
    </div>
  );
}
