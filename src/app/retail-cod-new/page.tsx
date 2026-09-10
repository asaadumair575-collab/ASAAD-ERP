import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchStageOrders, fetchStageCounts } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "@/components/retail-cod-v2/PageHeader";
import StageChart from "@/components/retail-cod-v2/StageChart";
import StageOverviewCards from "@/components/retail-cod-v2/StageOverviewCards";
import StatCards from "@/components/retail-cod-v2/StatCards";
import FilterBar from "@/components/retail-cod-v2/FilterBar";
import Pagination from "@/components/retail-cod-v2/Pagination";
import OrdersTable from "@/components/retail-cod-v2/OrdersTable";

export default async function AllOrdersV2Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { q, from, to, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const [result, counts] = await Promise.all([
    fetchStageOrders({ q, from, to, page: currentPage }),
    fetchStageCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader active="/retail-cod-new" title="Retail COD — All Orders" subtitle="Every order across the pipeline, all in one place" />
      <StageOverviewCards counts={counts} />
      <StatCards totalCount={result.totalCount} totalValue={result.totalValue} />
      <StageChart counts={counts} />
      <FilterBar basePath="/retail-cod-new" q={q} from={from} to={to} />
      <OrdersTable orders={result.orders} showStageColumn />
      <Pagination basePath="/retail-cod-new" currentPage={result.currentPage} totalPages={result.totalPages} query={{ q, from, to }} />
    </div>
  );
}
