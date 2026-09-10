import { fetchStageOrders } from "@/lib/retail-cod-v2/fetchOrders";
import PageHeader from "./PageHeader";
import StatCards from "./StatCards";
import FilterBar from "./FilterBar";
import Pagination from "./Pagination";
import OrdersTable from "./OrdersTable";

export default async function StagePage({
  stage,
  active,
  basePath,
  title,
  subtitle,
  searchParams,
}: {
  stage: string;
  active: string;
  basePath: string;
  title: string;
  subtitle: string;
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const { q, from, to, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const result = await fetchStageOrders({ stage, q, from, to, page: currentPage, oldestFirst: true });

  return (
    <div className="space-y-6">
      <PageHeader active={active} title={title} subtitle={subtitle} />
      <StatCards totalCount={result.totalCount} totalValue={result.totalValue} />
      <FilterBar basePath={basePath} q={q} from={from} to={to} />
      <OrdersTable orders={result.orders} showStageColumn={false} />
      <Pagination basePath={basePath} currentPage={result.currentPage} totalPages={result.totalPages} query={{ q, from, to }} />
    </div>
  );
}
