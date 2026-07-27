import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import BackupButtons from "@/components/BackupButtons";

export default async function BackupPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Backup</h1>
        <p className="text-sm text-gray-500 mt-0.5">CSV files download karo aur apne Google Drive folder mein save karo</p>
      </div>
      <BackupButtons />
    </div>
  );
}
