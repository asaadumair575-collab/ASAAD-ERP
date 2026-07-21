import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parsePermissions, canView } from "@/lib/permissions";
import { approveEmpCommission, rejectEmpCommission, deleteEmpCommissionEntry, submitEmpCommission } from "@/lib/actions";
import Link from "next/link";
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
      orderBy: [{ createdAt: "desc" }],
    });

    const pending = entries.filter((e) => e.status === "pending");
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
          <p className="text-sm text-gray-500 mt-0.5">Rs 30 per order · approve employee submissions.</p>
        </div>

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

        {pending.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-orange-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              Pending Approval ({pending.length})
            </h2>
            <div className="bg-white border border-orange-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-orange-50 border-b border-orange-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                    <th className="py-3 px-5">Employee</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5 text-right">Orders</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5">Note</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-50">
                  {pending.map((e) => {
                    const approveBound = approveEmpCommission.bind(null, e.id);
                    const rejectBound = rejectEmpCommission.bind(null, e.id);
                    return (
                      <tr key={e.id} className="hover:bg-orange-50/50 transition-colors">
                        <td className="py-3 px-5 font-medium">{e.user.displayName ?? e.user.username}</td>
                        <td className="py-3 px-5 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="py-3 px-5 text-right">{e.orders}</td>
                        <td className="py-3 px-5 text-right font-medium">Rs {fmt(e.orders * RATE)}</td>
                        <td className="py-3 px-5 text-gray-500 text-xs">{e.note ?? "—"}</td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form action={approveBound}>
                              <SubmitButton pendingText="…" className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                                Approve
                              </SubmitButton>
                            </form>
                            <form action={rejectBound}>
                              <SubmitButton pendingText="…" className="border border-gray-200 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                Reject
                              </SubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
      </div>
    );
  }

  /* ── EMPLOYEE VIEW ── */
  const entries = await prisma.empCommissionEntry.findMany({
    where: { userId: me.id },
    orderBy: { date: "desc" },
  });

  const approved = entries.filter((e) => e.status === "approved");
  const pending = entries.filter((e) => e.status === "pending");
  const totalEarned = approved.reduce((s, e) => s + e.orders * RATE, 0);
  const totalOrders = approved.reduce((s, e) => s + e.orders, 0);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Commission</h1>
        <p className="text-sm text-gray-500 mt-0.5">Rs 30 per order · submit daily and wait for admin approval.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black text-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400">Total Earned</p>
          <p className="text-3xl font-bold mt-1">Rs {fmt(totalEarned)}</p>
          <p className="text-xs text-gray-400 mt-1">{totalOrders} orders approved</p>
        </div>
        {pending.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-orange-600">Pending Approval</p>
            <p className="text-3xl font-bold mt-1 text-orange-700">
              Rs {fmt(pending.reduce((s, e) => s + e.orders * RATE, 0))}
            </p>
            <p className="text-xs text-orange-500 mt-1">{pending.length} {pending.length === 1 ? "entry" : "entries"} waiting</p>
          </div>
        )}
      </div>

      {/* Submit form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Submit Today&apos;s Orders</h2>
        <form action={submitEmpCommission} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Date <span className="text-black">*</span></label>
              <input type="date" name="date" required defaultValue={today}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Orders <span className="text-black">*</span></label>
              <input type="number" name="orders" required min={1} placeholder="e.g. 12"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Note (optional)</label>
            <input type="text" name="note" placeholder="e.g. half day"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <SubmitButton pendingText="Submitting…" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
            Submit for Approval
          </SubmitButton>
        </form>
      </div>

      {entries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Orders</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5">Note</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-5 text-gray-700 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="py-3 px-5 text-right">{e.orders}</td>
                  <td className="py-3 px-5 text-right font-medium">Rs {fmt(e.orders * RATE)}</td>
                  <td className="py-3 px-5 text-gray-500 text-xs">{e.note ?? "—"}</td>
                  <td className="py-3 px-5 text-right">
                    {e.status === "approved"
                      ? <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">Approved</span>
                      : <span className="bg-orange-100 text-orange-600 text-xs font-medium px-2 py-0.5 rounded-full">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
