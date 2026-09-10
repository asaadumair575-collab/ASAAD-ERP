import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import StagePage from "@/components/retail-cod-v2/StagePage";

export default async function ReadyToPackOrdersV2Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <StagePage
      stage="READY_TO_PACK"
      active="/retail-cod-new/ready-to-pack"
      basePath="/retail-cod-new/ready-to-pack"
      title="Ready to Pack"
      subtitle="Cleared for packing — oldest waiting first"
      searchParams={searchParams}
    />
  );
}
