import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { confirmDraftOrder, deleteDraftOrder } from "@/lib/actions";
import SlipActions from "./SlipActions";

export default async function DraftSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const [draft, profile] = await Promise.all([
    prisma.draftOrder.findUnique({
      where: { id: parseInt(id) },
      include: { createdBy: { select: { displayName: true, username: true } } },
    }),
    prisma.businessProfile.findFirst(),
  ]);

  if (!draft) notFound();
  if (!me.isAdmin && draft.createdById !== me.id) notFound();

  const confirmAction = confirmDraftOrder.bind(null, draft.id);
  const deleteAction  = deleteDraftOrder.bind(null, draft.id);

  const dateStr = new Date(draft.createdAt).toLocaleDateString("en-PK", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Build retail new order URL with prefilled params
  const retailUrl = `/retail/new?${new URLSearchParams({
    ...(draft.customerName ? { name: draft.customerName } : {}),
    ...(draft.phone        ? { phone: draft.phone }       : {}),
    ...(draft.city         ? { city: draft.city }         : {}),
    ...(draft.address      ? { address: draft.address }   : {}),
  }).toString()}`;

  return (
    <div className="max-w-lg space-y-4">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/retail/drafts" className="text-xs text-gray-400 hover:text-gray-600">← Drafts</Link>
        <div className="flex gap-2">
          {!draft.confirmed && (
            <form action={deleteAction}>
              <button type="submit" className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-3 py-1.5 rounded-lg">
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {/* THE SLIP */}
      <div id="slip" className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Header with logo */}
        <div className="bg-gray-900 px-6 py-5 text-white text-center">
          {profile?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo} alt="logo" className="h-12 mx-auto mb-2 object-contain" />
          )}
          <p className="text-lg font-bold tracking-wide">{profile?.name ?? "ASAAD ERP"}</p>
          {profile?.phone && <p className="text-xs text-gray-400 mt-0.5">{profile.phone}</p>}
        </div>

        {/* Slip title */}
        <div className="bg-orange-50 border-b border-orange-100 px-6 py-3 text-center">
          <p className="text-sm font-bold text-orange-700 uppercase tracking-widest">Order Confirmation Slip</p>
          <p className="text-[11px] text-orange-500 mt-0.5">#{String(draft.id).padStart(5, "0")} · {dateStr}</p>
        </div>

        {/* Customer info */}
        <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Customer</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{draft.customerName}</p>
          </div>
          {draft.phone && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{draft.phone}</p>
            </div>
          )}
          {draft.city && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">City</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{draft.city}</p>
            </div>
          )}
          {draft.address && (
            <div className="col-span-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Address</p>
              <p className="text-sm text-gray-800 mt-0.5">{draft.address}</p>
            </div>
          )}
          {draft.items && (
            <div className="col-span-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Order Items</p>
              <p className="text-sm text-gray-800 mt-0.5">{draft.items}</p>
            </div>
          )}
        </div>

        {/* Advance amount — BIG */}
        <div className="px-6 py-6 bg-black text-white text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Apna Order Confirm Karne Ke Liye</p>
          <p className="text-5xl font-black tracking-tight">₨{draft.advanceAmount.toLocaleString()}</p>
          <p className="text-sm font-semibold text-gray-300 mt-1">Advance Bhejein</p>
        </div>

        {/* Bank account */}
        {(profile?.bankAccountNumber || profile?.bankName) ? (
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-3">Bank Details</p>
            <div className="space-y-2">
              {profile.bankName && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Bank</span>
                  <span className="text-sm font-semibold text-gray-900">{profile.bankName}</span>
                </div>
              )}
              {profile.bankAccountTitle && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Account Title</span>
                  <span className="text-sm font-semibold text-gray-900">{profile.bankAccountTitle}</span>
                </div>
              )}
              {profile.bankAccountNumber && (
                <div className="flex justify-between items-center bg-white rounded-xl px-4 py-2 border border-gray-200">
                  <span className="text-xs text-gray-500">Account Number</span>
                  <span className="text-base font-black text-gray-900 tracking-wider">{profile.bankAccountNumber}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-b border-gray-100 text-center text-xs text-red-400">
            ⚠ Bank account not configured — go to Drafts settings
          </div>
        )}

        {/* Footer note */}
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Payment ke baad screenshot bhejein. Advance receive hone ke baad aapka order process kiya jayega.
          </p>
          {draft.confirmed && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full text-xs font-semibold">
              ✓ Advance Confirmed
            </div>
          )}
        </div>
      </div>

      {/* Action buttons — below slip */}
      <SlipActions
        confirmed={draft.confirmed}
        retailUrl={retailUrl}
        confirmAction={confirmAction}
      />
    </div>
  );
}
