import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parsePermissions, canView } from "@/lib/permissions";
import { deleteEmpCommissionEntry } from "@/lib/actions";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";

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

  if (me.isAdmin) {
    // Admin: see all employees' entries
    const entries = await prisma.empCommissionEntry.findMany({
      include: { user: { select: { id: true, displayName: true, username: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    // Group totals per user
    const totals: Record<number, { name: string; total: number; entries: number }> = {};
    for (const e of entries) {
      if (!totals[e.userId]) totals[e.userId] = { name: e.user.displayName ?? e.user.username, total: 0, entries: 0 };
      totals[e.userId].total += e.orders * e.ratePerOrder;
      totals[e.userId].entries += 1;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Employee Commission</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track per-order commission for each employee.</p>
          </div>
          <Link href="/emp-commission/new" className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            + Add Entry
          </Link>
        </div>

        {/* Per-employee totals */}
        {Object.keys(totals).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(totals).map(([, t]) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 truncate">{t.name}</p>
                <p className="text-xl font-semibold mt-1">Rs {fmt(t.total)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.entries} {t.entries === 1 ? "entry" : "entries"}</p>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No commission entries yet.</p>
            <Link href="/emp-commission/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">
              + Add first entry
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Orders</th>
                  <th className="py-3 px-5 text-right">Rate</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5">Note</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => {
                  const amount = e.orders * e.ratePerOrder;
                  const delBound = deleteEmpCommissionEntry.bind(null, e.id);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-5 font-medium">{e.user.displayName ?? e.user.username}</td>
                      <td className="py-3 px-5 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="py-3 px-5 text-right">{e.orders}</td>
                      <td className="py-3 px-5 text-right text-gray-500">Rs {e.ratePerOrder}</td>
                      <td className="py-3 px-5 text-right font-medium">Rs {fmt(amount)}</td>
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
    );
  }

  // Non-admin employee: see only their own entries
  const entries = await prisma.empCommissionEntry.findMany({
    where: { userId: me.id },
    orderBy: [{ date: "desc" }],
  });

  const total = entries.reduce((s, e) => s + e.orders * e.ratePerOrder, 0);
  const totalOrders = entries.reduce((s, e) => s + e.orders, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Commission</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your per-order commission earnings.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black text-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400">Total Earned</p>
          <p className="text-3xl font-bold mt-1">Rs {fmt(total)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-3xl font-bold mt-1">{totalOrders}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No commission entries recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Orders</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-5 text-gray-700 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="py-3 px-5 text-right">{e.orders}</td>
                  <td className="py-3 px-5 text-right font-medium">Rs {fmt(e.orders * e.ratePerOrder)}</td>
                  <td className="py-3 px-5 text-gray-500 text-xs">{e.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
