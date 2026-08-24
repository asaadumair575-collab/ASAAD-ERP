import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import RetailCprImportForm from "@/components/RetailCprImportForm";

export default async function RetailCprPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">PostEx CPR Import — Retail</h1>
      <RetailCprImportForm />
    </div>
  );
}
