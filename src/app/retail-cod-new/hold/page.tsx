import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import StagePage from "@/components/retail-cod-v2/StagePage";

export default async function HoldOrdersV2Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <StagePage
      stage="HOLD"
      active="/retail-cod-new/hold"
      basePath="/retail-cod-new/hold"
      title="Hold Orders"
      subtitle="Paused — needs a decision before moving on"
      searchParams={searchParams}
    />
  );
}
