import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ParcelScanner from "@/components/ParcelScanner";

export default async function ParcelScannerPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <div className="py-4">
      <ParcelScanner employeeName={me.displayName ?? me.username} />
    </div>
  );
}
