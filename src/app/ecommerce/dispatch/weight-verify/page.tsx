import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import WeightVerifyScanner from "@/components/WeightVerifyScanner";

export default async function WeightVerifyPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Weight Verification</h1>
        <p className="text-sm text-gray-400 mt-0.5">Scan a parcel, then photograph it on the scale — one after another</p>
      </div>

      <WeightVerifyScanner />
    </div>
  );
}
