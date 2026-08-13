import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { saveBankDetails } from "@/lib/actions";

export default async function DraftsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const [drafts, profile] = await Promise.all([
    prisma.draftOrder.findMany({
      where: me.isAdmin ? undefined : { createdById: me.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { displayName: true, username: true } } },
    }),
    prisma.businessProfile.findFirst(),
  ]);

  const pending   = drafts.filter((d) => !d.confirmed);
  const confirmed = drafts.filter((d) => d.confirmed);

  const hasBankInfo = profile?.bankAccountNumber;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Draft Orders</h1>
          <p className="text-xs text-gray-400 mt-0.5">Send advance payment slip to customer before creating order</p>
        </div>
        <Link
          href="/retail/drafts/new"
          className="bg-black text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
        >
          + Create Draft
        </Link>
      </div>

      {/* Bank account setup — admin only, show if not configured */}
      {me.isAdmin && !hasBankInfo && (
        <form action={saveBankDetails} className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-800">⚠ Bank account not configured — slips won&apos;t show payment details</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Bank Name</label>
              <input name="bankName" defaultValue={profile?.bankName ?? ""} placeholder="e.g. HBL" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Account Title</label>
              <input name="bankAccountTitle" defaultValue={profile?.bankAccountTitle ?? ""} placeholder="e.g. Asaad Enterprises" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Account Number</label>
              <input name="bankAccountNumber" defaultValue={profile?.bankAccountNumber ?? ""} placeholder="e.g. 0123456789" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
          <button type="submit" className="bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
            Save Bank Details
          </button>
        </form>
      )}

      {/* Pending */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Pending ({pending.length})
        </p>
        {pending.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-sm text-gray-400">No pending drafts</p>
          </div>
        )}
        {pending.map((d) => (
          <Link key={d.id} href={`/retail/drafts/${d.id}`}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm hover:border-gray-300 transition-colors">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
              {d.customerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{d.customerName}</p>
              <p className="text-xs text-gray-400 truncate">
                {d.phone ?? "No phone"} {d.city ? `· ${d.city}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-orange-600">₨{d.advanceAmount}</p>
              <p className="text-[10px] text-gray-400">
                {new Date(d.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
              </p>
            </div>
            <span className="text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full shrink-0">
              Pending
            </span>
          </Link>
        ))}
      </div>

      {/* Confirmed */}
      {confirmed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Confirmed ({confirmed.length})
          </p>
          {confirmed.map((d) => (
            <Link key={d.id} href={`/retail/drafts/${d.id}`}
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm opacity-70 hover:opacity-100 transition-opacity">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">
                {d.customerName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{d.customerName}</p>
                <p className="text-xs text-gray-400 truncate">{d.phone ?? ""} {d.city ? `· ${d.city}` : ""}</p>
              </div>
              <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                ✓ Confirmed
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
