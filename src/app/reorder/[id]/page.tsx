import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import CallLogButton from "./CallLogButton";
import NoteCell from "./NoteCell";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:        { label: "Pending",        color: "bg-gray-100 text-gray-500" },
  NO_ANSWER:      { label: "No Answer",      color: "bg-yellow-100 text-yellow-700" },
  CALLBACK:       { label: "Callback",       color: "bg-blue-100 text-blue-700" },
  NOT_INTERESTED: { label: "Not Interested", color: "bg-red-100 text-red-600" },
  ORDER_PLACED:   { label: "Interested",     color: "bg-violet-100 text-violet-700" },
  ORDER_RECEIVED: { label: "Order Received", color: "bg-green-100 text-green-700" },
};

export default async function ReorderCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { id } = await params;
  const { status, q } = await searchParams;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const campaign = await prisma.reorderCampaign.findUnique({
    where: { id: parseInt(id) },
    include: {
      createdBy: { select: { displayName: true, username: true } },
      leads: {
        include: { calledBy: { select: { id: true, displayName: true, username: true, isAdmin: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!campaign) notFound();

  const leads = campaign.leads.filter((l) => {
    if (status && l.status !== status) return false;
    if (q) {
      const qq = q.toLowerCase();
      return (
        l.customerName.toLowerCase().includes(qq) ||
        l.phone.includes(qq) ||
        (l.city ?? "").toLowerCase().includes(qq)
      );
    }
    return true;
  });

  const total = campaign.leads.length;
  const pending = campaign.leads.filter((l) => l.status === "PENDING").length;
  const called = campaign.leads.filter((l) => l.status !== "PENDING").length;
  const interested = campaign.leads.filter((l) => l.status === "ORDER_PLACED").length;
  const ordered = campaign.leads.filter((l) => l.status === "ORDER_RECEIVED").length;
  const noAnswer = campaign.leads.filter((l) => l.status === "NO_ANSWER").length;
  const notInterested = campaign.leads.filter((l) => l.status === "NOT_INTERESTED").length;
  const callback = campaign.leads.filter((l) => l.status === "CALLBACK").length;

  // Today's calls per employee (non-admin only)
  const todayEmpMap = new Map<number, { name: string; total: number; interested: number; orderReceived: number; notInterested: number; noAnswer: number }>();
  for (const l of campaign.leads) {
    if (!l.calledBy || l.calledBy.isAdmin) continue;
    if (!l.calledAt || new Date(l.calledAt) < todayStart) continue;
    const uid = l.calledBy.id;
    const name = l.calledBy.displayName ?? l.calledBy.username;
    const e = todayEmpMap.get(uid) ?? { name, total: 0, interested: 0, orderReceived: 0, notInterested: 0, noAnswer: 0 };
    e.total++;
    if (l.status === "ORDER_PLACED")    e.interested++;
    if (l.status === "ORDER_RECEIVED")  e.orderReceived++;
    if (l.status === "NOT_INTERESTED")  e.notInterested++;
    if (l.status === "NO_ANSWER")       e.noAnswer++;
    todayEmpMap.set(uid, e);
  }
  const todayEmpStats = Array.from(todayEmpMap.values()).sort((a, b) => b.total - a.total);

  const meSerial = { id: me.id, displayName: me.displayName ?? null };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/reorder" className="text-sm text-gray-400 hover:text-gray-600">← Campaigns</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Created {new Date(campaign.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
            {campaign.createdBy && ` · ${campaign.createdBy.displayName ?? campaign.createdBy.username}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Total", value: total, color: "text-gray-700" },
          { label: "Pending", value: pending, color: "text-amber-600" },
          { label: "Interested", value: interested, color: "text-violet-600" },
          { label: "Orders", value: ordered, color: "text-green-600" },
          { label: "No Answer", value: noAnswer, color: "text-yellow-600" },
          { label: "Not Interested", value: notInterested, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="font-medium">Call Progress</span>
          <span>{total > 0 ? Math.round((called / total) * 100) : 0}% complete</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
          {total > 0 && (
            <>
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(ordered / total) * 100}%` }} />
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${(interested / total) * 100}%` }} />
              <div className="h-full bg-red-400 transition-all" style={{ width: `${(notInterested / total) * 100}%` }} />
              <div className="h-full bg-yellow-400 transition-all" style={{ width: `${(noAnswer / total) * 100}%` }} />
            </>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Order Received</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />Interested</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Not Interested</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />No Answer</span>
        </div>
      </div>

      {/* Today's calls per employee */}
      {todayEmpStats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aaj ki Calls — Is Campaign Mein</p>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <div className="space-y-2">
            {todayEmpStats.map((e) => (
              <div key={e.name} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-zinc-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {e.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.name}</p>
                    <p className="text-sm font-bold text-gray-900 shrink-0 ml-2">{e.total} calls</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {e.orderReceived > 0 && <span className="text-green-600 font-medium">🟢 {e.orderReceived} order</span>}
                    {e.interested > 0    && <span className="text-violet-600 font-medium">✅ {e.interested} interested</span>}
                    {e.noAnswer > 0      && <span className="text-yellow-600">📵 {e.noAnswer}</span>}
                    {e.notInterested > 0 && <span className="text-red-500">❌ {e.notInterested}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, phone, city..."
          className="flex-1 min-w-[160px] text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {(q || status) && (
          <Link href={`/reorder/${id}`} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2">
            Clear
          </Link>
        )}
      </form>

      {/* Leads table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No leads match the filter</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-3 px-4 text-left hidden sm:table-cell">#</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Phone</th>
                <th className="py-3 px-4 text-left hidden md:table-cell">City</th>
                <th className="py-3 px-4 text-left hidden lg:table-cell">Last Order</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Note</th>
                <th className="py-3 px-4 text-left sticky right-0 bg-gray-50 z-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l, i) => {
                const st = STATUS_LABELS[l.status] ?? STATUS_LABELS.PENDING;
                return (
                  <tr key={l.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-4 text-gray-300 text-xs hidden sm:table-cell">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{l.customerName}</p>
                      {l.calledBy && (
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-none">
                          {l.calledBy.displayName ?? l.calledBy.username}
                          {l.calledAt && <span className="text-gray-300"> · {new Date(l.calledAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 font-mono text-xs hidden sm:table-cell">{l.phone}</td>
                    <td className="py-2.5 px-4 text-gray-400 text-sm hidden md:table-cell">{l.city || "—"}</td>
                    <td className="py-2.5 px-4 text-gray-300 text-xs truncate max-w-[140px] hidden lg:table-cell">{l.prevItem || "—"}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 hidden sm:table-cell"><NoteCell note={l.callNote ?? ""} /></td>
                    <td className="py-2.5 px-4 sticky right-0 bg-inherit">
                      <CallLogButton lead={{ id: l.id, customerName: l.customerName, phone: l.phone, status: l.status, callNote: l.callNote ?? "" }} me={meSerial} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
