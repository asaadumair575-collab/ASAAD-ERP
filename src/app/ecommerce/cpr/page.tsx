import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CprImportForm from "@/components/CprImportForm";

export default async function CprPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/ecommerce");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CPR Settlement</h1>
        <p className="text-sm text-gray-500 mt-1">PostEx ka weekly CPR PDF upload karo — delivered orders pe payment record ho jayegi, returned orders automatically mark ho jayenge.</p>
      </div>
      <CprImportForm />
    </div>
  );
}
