import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import BulkDispatchForm from "@/components/BulkDispatchForm";

export default async function BulkDispatchPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-1">Bulk Dispatch</h1>
      <p className="text-sm text-gray-500 mb-6">Upload the PostEx Order History CSV to save tracking numbers on matched retail orders.</p>
      <BulkDispatchForm />
    </div>
  );
}
