import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import StagePage from "@/components/retail-cod-v2/StagePage";

export default async function PackedDispatchOrdersV2Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <StagePage
      stage="PACKED_DISPATCH"
      active="/retail-cod-new/packed-dispatch"
      basePath="/retail-cod-new/packed-dispatch"
      title="Packed & Ready to Dispatch"
      subtitle="Boxed up and waiting for courier pickup"
      searchParams={searchParams}
    />
  );
}
