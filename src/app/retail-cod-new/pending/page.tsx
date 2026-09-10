import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import StagePage from "@/components/retail-cod-v2/StagePage";

export default async function PendingOrdersV2Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <StagePage
      stage="PENDING"
      active="/retail-cod-new/pending"
      basePath="/retail-cod-new/pending"
      title="Pending Orders"
      subtitle="Waiting on a first look — oldest waiting first"
      searchParams={searchParams}
    />
  );
}
