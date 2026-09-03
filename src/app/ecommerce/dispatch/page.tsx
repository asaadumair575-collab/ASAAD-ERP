import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OperationsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      <div className="bg-[#16202E] rounded-2xl px-6 py-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#BFD732]" />
        <p className="text-[11px] font-semibold text-[#BFD732] uppercase tracking-[0.18em] mb-1">Retail COD · The Boundary Shop</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Operations</h1>
        <p className="text-sm text-gray-400 mt-0.5">Dispatch sheets, airway bills, and parcel weight verification</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OpCard
          href="/ecommerce/dispatch/sheet"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <rect x="3" y="2.5" width="14" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 6.5h7M6.5 10h7M6.5 13.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          title="Generate Dispatch Sheet"
          description="Pick a date, get the full dispatch list, and save it as PDF"
        />
        <OpCard
          href="/ecommerce/dispatch/airway-bills"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M4 3.5h9l3 3v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M13 3.5V7h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M6 11h8M6 13.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          title="PostEx Airway Bills"
          description="Download the PostEx airway bill / label PDFs for a day's dispatched parcels"
        />
        <OpCard
          href="/ecommerce/dispatch/weight-verify"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          title="Weight Verification"
          description="Scan a parcel, snap a photo of it on the scale, and log its weight"
          badge="Employees"
        />
        <OpCard
          href="/ecommerce/dispatch/final-list"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M4 10h2.5l1.5-4 3 8 1.5-4H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          }
          title="Final Dispatch List"
          description="Every weight-verified parcel with its weight and a grand total, for gate handover"
        />
      </div>
    </div>
  );
}

function OpCard({
  href, icon, title, description, badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#BFD732] transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#16202E] text-[#BFD732] flex items-center justify-center">
          {icon}
        </div>
        {badge && (
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{badge}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-[#16202E] group-hover:text-[#16202E]">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </Link>
  );
}
