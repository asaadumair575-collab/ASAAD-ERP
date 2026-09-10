import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchStageOrders, fetchStageCounts } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "@/components/retail-cod-v2/PageHeader";
import StageChart from "@/components/retail-cod-v2/StageChart";
import OrdersTable from "@/components/retail-cod-v2/OrdersTable";

export default async function AllOrdersV2Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const [orders, counts] = await Promise.all([fetchStageOrders(), fetchStageCounts()]);

  return (
    <div className="space-y-6">
      <PageHeader active="/retail-cod-new" title="Retail COD — All Orders" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} across every stage`} />
      <StageChart counts={counts} />
      <OrdersTable orders={orders} showStageColumn />
    </div>
  );
}
