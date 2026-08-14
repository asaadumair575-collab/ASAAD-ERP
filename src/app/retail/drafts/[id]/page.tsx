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

  const retailUrl = `/retail/new?${new URLSearchParams({
    ...(draft.customerName ? { name: draft.customerName } : {}),
    ...(draft.phone        ? { phone: draft.phone }       : {}),
    ...(draft.city         ? { city: draft.city }         : {}),
    ...(draft.address      ? { address: draft.address }   : {}),
  }).toString()}`;

  const slipNo = `#${String(draft.id).padStart(5, "0")}`;

  return (
    <div className="max-w-sm mx-auto space-y-4">
      {/* Nav — hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/retail/drafts" className="text-xs text-gray-400 hover:text-gray-600">← Drafts</Link>
        {!draft.confirmed && (
          <form action={deleteAction}>
            <button type="submit" className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </form>
        )}
      </div>

      {/* ── SLIP ── */}
      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-md print:shadow-none print:border-gray-400">

        {/* Logo + Business name */}
        <div className="px-5 pt-3 pb-2 text-center border-b border-gray-200">
          {profile?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo}
              alt={profile.name}
              className="h-10 mx-auto mb-1 object-contain"
            />
          ) : (
            <div className="w-10 h-10 mx-auto mb-1 bg-black rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-black">
                {(profile?.name ?? "A").charAt(0)}
              </span>
            </div>
          )}
          <p className="text-base font-black tracking-tight text-gray-900">{profile?.name ?? "ASAAD ERP"}</p>
          {profile?.phone && (
            <p className="text-[10px] font-semibold text-gray-600 mt-0.5">{profile.phone}</p>
          )}
          {profile?.address && (
            <p className="text-[9px] text-gray-400 mt-0.5">{profile.address}</p>
          )}
        </div>

        {/* Status */}
        <div className="px-5 py-2 border-b border-dashed border-gray-300 bg-gray-50 flex justify-center">
          {draft.confirmed ? (
            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-300 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
              ✓ Advance Received
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
              ⏳ Waiting for Advance
            </span>
          )}
        </div>

        {/* Customer details */}
        <div className="px-5 py-2 border-b border-gray-100 space-y-1.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Prepared For</p>
              <p className="text-sm font-bold text-gray-900">{draft.customerName}</p>
              {draft.phone && <p className="text-xs text-gray-600 mt-0.5">{draft.phone}</p>}
            </div>
            {draft.city && (
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">City</p>
                <p className="text-xs font-semibold text-gray-700">{draft.city}</p>
              </div>
            )}
          </div>
          {draft.address && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Address</p>
              <p className="text-xs text-gray-700">{draft.address}</p>
            </div>
          )}
          {draft.items && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Order Details</p>
              <p className="text-xs text-gray-700">{draft.items}</p>
            </div>
          )}
        </div>

        {/* Advance amount */}
        <div className="px-5 py-3 border-b border-dashed border-gray-200 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">
            Advance Payment Required
          </p>
          <p className="text-3xl font-black text-gray-900 tracking-tight leading-none">
            Rs. {draft.advanceAmount.toLocaleString()}
          </p>
          <p className="text-[9px] font-medium text-gray-400 mt-1 tracking-widest uppercase">
            To Confirm Your Order
          </p>
        </div>


        {/* Bank details */}
        {(profile?.bankAccountNumber || profile?.bankName) ? (
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 text-center mb-2">
              Transfer To
            </p>
            <div className="space-y-1.5">
              {profile.bankName && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Bank</span>
                  <span className="text-xs font-semibold text-gray-800">{profile.bankName}</span>
                </div>
              )}
              {profile.bankAccountTitle && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Account Title</span>
                  <span className="text-xs font-semibold text-gray-800">{profile.bankAccountTitle}</span>
                </div>
              )}
              {profile.bankAccountNumber && (
                <div className="mt-1 rounded-lg border-2 border-gray-900 px-4 py-2 text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Account No.</p>
                  <p className="text-sm font-black text-gray-900 tracking-wider break-all">{profile.bankAccountNumber}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 border-b border-gray-100 text-center text-xs text-red-400">
            ⚠ Bank account not configured
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2.5 text-center space-y-0.5">
          <p className="text-[10px] text-gray-500">
            After payment, send screenshot on WhatsApp.
          </p>
          <p className="text-[10px] text-gray-400">
            Your order will be processed once advance is received.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <SlipActions
        confirmed={draft.confirmed}
        retailUrl={retailUrl}
        confirmAction={confirmAction}
      />
    </div>
  );
}
