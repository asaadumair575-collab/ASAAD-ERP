import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import StagePage from "@/components/retail-cod-v2/StagePage";

export default async function ConfirmedOrdersV2Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <StagePage
      stage="CONFIRMED"
      active="/retail-cod-new/confirmed"
      basePath="/retail-cod-new/confirmed"
      title="Confirmed Orders"
      subtitle="Confirmed with the customer — oldest waiting first"
      searchParams={searchParams}
    />
  );
}
