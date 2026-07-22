import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parsePermissions, canView } from "@/lib/permissions";
import { approveEmpCommission, rejectEmpCommission, deleteEmpCommissionEntry, submitEmpCommission } from "@/lib/actions";
import DeleteButton from "@/components/DeleteButton";
import SubmitButton from "@/components/SubmitButton";

const RATE = 30;

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

export default async function EmpCommissionPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const perms = parsePermissions(me.permissions);
  if (!me.isAdmin && !canView(perms, "emp_commission", false)) redirect("/");

  /* ── ADMIN VIEW ── */
  if (me.isAdmin) {
    const entries = await prisma.empCommissionEntry.findMany({
      include: { user: { select: { id: true, displayName: true, username: true } } },
      orderBy: { createdAt: "desc" },
    });

    const pending  = entries.filter((e) => e.status === "pending");
    const approved = entries.filter((e) => e.status === "approved");

    const totals: Record<number, { name: string; total: number }> = {};
    for (const e of approved) {
      if (!totals[e.userId]) totals[e.userId] = { name: e.user.displayName ?? e.user.username, total: 0 };
      totals[e.userId].total += e.orders * RATE;
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Commission</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rs 30 per order · approve or reject employee submissions.</p>
        </div>

        {/* Per-employee approved totals */}
        {Object.values(totals).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(totals).map((t) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 truncate">{t.name}</p>
                <p className="text-xl font-semibold mt-1">Rs {fmt(t.total)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pending approvals */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-orange-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              Pending Approval ({pending.length})
            </h2>
            {pending.map((e) => {
              const approveBound = approveEmpCommission.bind(null, e.id);
              const rejectBound = rejectEmpCommission.bind(null, e.id);
              return (
                <div key={e.id} className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{e.user.displayName ?? e.user.username}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDate(e.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-semibold">Rs {fmt(e.orders * RATE)}</p>
                      <p className="text-xs text-gray-500">{e.orders} orders × Rs {RATE}</p>
                    </div>
                  </div>
                  {e.note && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">Note: {e.note}</p>
                  )}
                  <div className="flex items-end gap-3 pt-1">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Rejection reason (if rejecting)</label>
                      <form action={rejectBound} className="flex gap-2">
                        <input
                          type="text"
                          name="adminNote"
                          placeholder="e.g. Orders count mismatch"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <SubmitButton pendingText="…" className="border border-gray-200 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                          Reject
                        </SubmitButton>
                      </form>
                    </div>
                    <form action={approveBound}>
                      <SubmitButton pendingText="…" className="bg-black text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap">
                        ✓ Approve
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Approved history */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Approved History</h2>
          {approved.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No approved entries yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                    <th className="py-3 px-5">Employee</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5 text-right">Orders</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5">Note</th>
                    <th className="py-3 px-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {approved.map((e) => {
                    const delBound = deleteEmpCommissionEntry.bind(null, e.id);
                    return (
                      <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-5 font-medium">{e.user.displayName ?? e.user.username}</td>
                        <td className="py-3 px-5 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="py-3 px-5 text-right">{e.orders}</td>
                        <td className="py-3 px-5 text-right font-medium">Rs {fmt(e.orders * RATE)}</td>
                        <td className="py-3 px-5 text-gray-500 text-xs">{e.note ?? "—"}</td>
                        <td className="py-3 px-5 text-right">
                          <DeleteButton action={delBound} message="Remove this commission entry?" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rejected history */}
        {(() => {
          const rejected = entries.filter((e) => e.status === "rejected");
          if (rejected.length === 0) return null;
          return (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-red-600">Rejected Entries ({rejected.length})</h2>
              <div className="bg-white border border-red-100 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-red-50 border-b border-red-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                      <th className="py-3 px-5">Employee</th>
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5 text-right">Orders</th>
                      <th className="py-3 px-5">Note</th>
                      <th className="py-3 px-5">Reason</th>
                      <th className="py-3 px-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {rejected.map((e) => {
                      const delBound = deleteEmpCommissionEntry.bind(null, e.id);
                      return (
                        <tr key={e.id} className="hover:bg-red-50/50 transition-colors">
                          <td className="py-3 px-5 font-medium">{e.user.displayName ?? e.user.username}</td>
                          <td className="py-3 px-5 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="py-3 px-5 text-right">{e.orders}</td>
                          <td className="py-3 px-5 text-gray-500 text-xs">{e.note ?? "—"}</td>
                          <td className="py-3 px-5 text-red-500 text-xs">{e.adminNote ?? "—"}</td>
                          <td className="py-3 px-5 text-right">
                            <DeleteButton action={delBound} message="Remove this rejected entry?" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  /* ── EMPLOYEE VIEW ── */
  const entries = await prisma.empCommissionEntry.findMany({
    where: { userId: me.id },
    orderBy: { date: "desc" },
  });

  const approved = entries.filter((e) => e.status === "approved");
  const pending  = entries.filter((e) => e.status === "pending");
  const rejected = entries.filter((e) => e.status === "rejected");

  const totalEarned = approved.reduce((s, e) => s + e.orders * RATE, 0);
  const totalOrders = approved.reduce((s, e) => s + e.orders, 0);
  const thisMonthOrders = approved
    .filter((e) => new Date(e.date).getMonth() === new Date().getMonth() &&
                   new Date(e.date).getFullYear() === new Date().getFullYear())
    .reduce((s, e) => s + e.orders, 0);
  const today = new Date().toISOString().split("T")[0];
  const name = me.displayName || me.username;

  const motivations = [
    "Mehnat ka phal meetha hota hai 💪",
    "Har order aik qadam aage hai 🚀",
    "Aaj bhi kamaal karo! ⭐",
    "Consistency hi success hai 🏆",
    "Aapki محنت rang laayegi! 🌟",
  ];
  const msg = motivations[new Date().getDay() % motivations.length];

  return (
    <div className="space-y-5">

      {/* Hero greeting */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-700 text-white rounded-3xl p-6 shadow-lg">
        <p className="text-sm text-zinc-400 mb-0.5">Assalamu Alaikum,</p>
        <h1 className="text-2xl font-bold tracking-tight">{name} 👋</h1>
        <p className="text-zinc-300 text-sm mt-2">{msg}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Total Kamai</p>
            <p className="text-4xl font-extrabold tracking-tight mt-0.5">Rs {fmt(totalEarned)}</p>
            <p className="text-xs text-zinc-400 mt-1">{totalOrders} orders approved</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Is Mahine</p>
            <p className="text-2xl font-bold text-green-400 mt-0.5">{thisMonthOrders} orders</p>
            <p className="text-xs text-zinc-400 mt-1">Rs {fmt(thisMonthOrders * RATE)}</p>
          </div>
        </div>
      </div>

      {/* Status pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-700">{approved.length}</p>
          <p className="text-xs text-green-600 font-medium mt-1">Approved ✓</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-orange-600">{pending.length}</p>
          <p className="text-xs text-orange-500 font-medium mt-1">Pending ⏳</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{rejected.length}</p>
          <p className="text-xs text-red-500 font-medium mt-1">Rejected ✗</p>
        </div>
      </div>

      {/* Submit form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="text-sm font-semibold">Aaj ke Orders Submit Karo</h2>
        </div>
        <form action={submitEmpCommission} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Taareekh <span className="text-black">*</span></label>
              <input type="date" name="date" required defaultValue={today}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Orders ki tadad <span className="text-black">*</span></label>
              <input type="number" name="orders" required min={1} placeholder="jaise 12"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Note (optional)</label>
            <input type="text" name="note" placeholder="jaise: half day, extra kaam"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <SubmitButton pendingText="Submit ho raha hai…" className="w-full bg-black text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors">
            ✓ Submit for Approval
          </SubmitButton>
        </form>
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Meri Requests</h2>
          {entries.map((e) => {
            const isPending  = e.status === "pending";
            const isApproved = e.status === "approved";
            const isRejected = e.status === "rejected";
            return (
              <div
                key={e.id}
                className={`rounded-2xl p-4 shadow-sm border ${
                  isApproved ? "bg-white border-green-200" :
                  isRejected ? "bg-red-50 border-red-200" :
                  "bg-white border-orange-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400">{fmtDate(e.date)}</p>
                    <p className="text-base font-semibold mt-0.5">{e.orders} orders</p>
                    {e.note && <p className="text-xs text-gray-400 mt-0.5">{e.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold">Rs {fmt(e.orders * RATE)}</p>
                    {isPending  && <span className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1">⏳ Pending</span>}
                    {isApproved && <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1">✓ Approved</span>}
                    {isRejected && <span className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1">✗ Rejected</span>}
                  </div>
                </div>
                {isRejected && (
                  <div className="mt-2.5 bg-red-100 text-red-700 text-xs rounded-xl px-3 py-2">
                    <span className="font-semibold">Admin note:</span> {e.adminNote ?? "Entry reject kar di gayi."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
          <p className="text-3xl mb-2">🚀</p>
          <p className="text-sm font-medium text-gray-700">Pehli entry submit karo!</p>
          <p className="text-xs text-gray-400 mt-1">Upar form bhar ke shuru karo.</p>
        </div>
      )}
    </div>
  );
}
