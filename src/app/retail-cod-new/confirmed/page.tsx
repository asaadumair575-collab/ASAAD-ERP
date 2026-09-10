import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchStageOrders } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "@/components/retail-cod-v2/PageHeader";
import OrdersTable from "@/components/retail-cod-v2/OrdersTable";

export default async function ConfirmedOrdersV2Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const orders = await fetchStageOrders("CONFIRMED");

  return (
    <div className="space-y-6">
      <PageHeader active="/retail-cod-new/confirmed" title="Confirmed Orders" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} confirmed with the customer`} />
      <OrdersTable orders={orders} showStageColumn={false} />
    </div>
  );
}
