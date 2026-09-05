import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function WorkPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto py-2">
      <div className="bg-gradient-to-br from-[#16202E] to-[#232F42] rounded-2xl px-6 py-10 text-center shadow-sm">
        <p className="text-xs font-semibold text-[#BFD732] uppercase tracking-widest mb-2">Employee</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">My Work</h1>
        <p className="text-sm text-gray-400 mt-2">Coming soon</p>
      </div>
    </div>
  );
}
