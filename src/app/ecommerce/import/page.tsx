import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import EcomImportForm from "@/components/EcomImportForm";

export default async function EcomImportPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Orders (PostEx CSV)</h1>
        <p className="text-sm text-gray-500 mt-1">PostEx se download ki hui CSV file yahan upload karo — orders auto add ho jayenge. Duplicate tracking numbers skip ho jayenge.</p>
      </div>
      <EcomImportForm />
    </div>
  );
}
