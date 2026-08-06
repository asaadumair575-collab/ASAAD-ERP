import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReorderUploadModal from "./ReorderUploadModal";
import DeleteCampaignButton from "./DeleteCampaignButton";
import LeadSearch from "./LeadSearch";
import { userLabel } from "@/lib/userLabel";
import { toggleReorderCampaignActive } from "@/lib/actions";

export default async function ReorderPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const campaigns = await prisma.reorderCampaign.findMany({
    where: me.isAdmin ? undefined : { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { displayName: true, username: true, isAdmin: true } },
      _count: { select: { leads: true } },
      leads: { select: { status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reorder Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">Upload delivered-parcel CSVs and track re-order calls</p>
        </div>
        <div className="flex items-center gap-2">
          <LeadSearch />
          <Link
            href="/reorder/retail-followup"
            className="border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
          >
            🔄 Retail Follow-up
          </Link>
          <ReorderUploadModal />
        </div>
      </div>


      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-4xl mb-3">📞</p>
          <p className="text-sm font-medium text-gray-500">No campaigns yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a delivered-parcels CSV to start</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const total      = c.leads.length;
            const pending    = c.leads.filter((l) => l.status === "PENDING").length;
            const called     = c.leads.filter((l) => l.status !== "PENDING").length;
            const interested = c.leads.filter((l) => l.status === "ORDER_PLACED").length;
            const ordered    = c.leads.filter((l) => l.status === "ORDER_RECEIVED").length;
            const pct = total > 0 ? Math.round((called / total) * 100) : 0;

            const toggleActive = toggleReorderCampaignActive.bind(null, c.id, !c.isActive);
            return (
              <div key={c.id} className={`bg-white border rounded-2xl shadow-sm p-5 ${c.isActive ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/reorder/${c.id}`} className="text-base font-semibold text-gray-900 hover:text-black truncate">
                        {c.name}
                      </Link>
                      {c.isRetailFollowup && (
                        <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">Retail</span>
                      )}
                      {!c.isActive && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">Paused</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      {c.createdBy && ` · by ${userLabel(c.createdBy)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/reorder/${c.id}`}
                      className="text-xs bg-black text-white font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      View Leads
                    </Link>
                    {me.isAdmin && (
                      <form action={toggleActive}>
                        <button
                          type="submit"
                          title={c.isActive ? "Pause campaign" : "Activate campaign"}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                            c.isActive
                              ? "border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                          }`}
                        >
                          {c.isActive ? "⏸ Pause" : "▶ Activate"}
                        </button>
                      </form>
                    )}
                    {me.isAdmin && <DeleteCampaignButton id={c.id} />}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {[
                    { label: "Total",      value: total,      color: "text-gray-700"   },
                    { label: "Pending",    value: pending,    color: "text-amber-600"  },
                    { label: "Called",     value: called,     color: "text-blue-600"   },
                    { label: "Interested", value: interested, color: "text-violet-600" },
                    { label: "Orders",     value: ordered,    color: "text-green-600"  },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Call progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
