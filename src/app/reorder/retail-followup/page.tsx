import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import RetailFollowupCallButton from "./RetailFollowupCallButton";
import { userLabel } from "@/lib/userLabel";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ORDER_RECEIVED: { label: "Ordered ✓",     color: "bg-green-100 text-green-700" },
  CALLBACK:       { label: "Follow-up",     color: "bg-blue-100 text-blue-700" },
  NOT_INTERESTED: { label: "Not Interested", color: "bg-red-100 text-red-600" },
  NO_ANSWER:      { label: "No Answer",     color: "bg-yellow-100 text-yellow-700" },
};

export default async function RetailFollowupPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { show, q } = await searchParams;
  const showAll = show === "all";

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);

  // All retail orders 15+ days old
  const orders = await prisma.retailOrder.findMany({
    where: { date: { lte: cutoff } },
    include: { items: true },
    orderBy: { date: "desc" },
  });

  // Deduplicate by phone — most recent order per customer
  type Customer = {
    customerName: string;
    phone: string;
    city: string | null;
    lastOrderDate: Date;
    lastOrderItems: string;
    daysSince: number;
  };
  const seen = new Map<string, Customer>();
  const now = new Date();
  for (const o of orders) {
    const phone = o.phone?.trim() || "";
    if (!phone || !o.customerName) continue;
    if (!seen.has(phone)) {
      const daysSince = Math.floor((now.getTime() - o.date.getTime()) / 86400000);
      const lastOrderItems = o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ") || "—";
      seen.set(phone, { customerName: o.customerName, phone, city: o.city ?? null, lastOrderDate: o.date, lastOrderItems, daysSince });
    }
  }

  // Latest log per phone
  const logs = await prisma.retailFollowupLog.findMany({
    orderBy: { calledAt: "desc" },
    include: { calledBy: { select: { displayName: true, username: true, isAdmin: true } } },
  });
  const latestLogByPhone = new Map<string, typeof logs[0]>();
  for (const log of logs) {
    if (!latestLogByPhone.has(log.phone)) latestLogByPhone.set(log.phone, log);
  }

  // Build display list
  let customers = Array.from(seen.values()).map((c) => ({
    ...c,
    latestLog: latestLogByPhone.get(c.phone),
  }));

  // Filter by search
  if (q) {
    const qq = q.toLowerCase();
    customers = customers.filter(
      (c) => c.customerName.toLowerCase().includes(qq) || c.phone.includes(qq) || (c.city ?? "").toLowerCase().includes(qq)
    );
  }

  // By default hide ORDER_RECEIVED and NOT_INTERESTED (they're done)
  const allCount = customers.length;
  if (!showAll) {
    customers = customers.filter((c) => {
      const s = c.latestLog?.status;
      return s !== "ORDER_RECEIVED" && s !== "NOT_INTERESTED";
    });
  }

  const doneCount = allCount - customers.filter((c) => {
    const s = c.latestLog?.status;
    return s !== "ORDER_RECEIVED" && s !== "NOT_INTERESTED";
  }).length;

  // Sort: CALLBACK first, then NO_ANSWER, then no-call (by days desc)
  customers.sort((a, b) => {
    const order = { CALLBACK: 0, NO_ANSWER: 1 } as Record<string, number>;
    const oa = order[a.latestLog?.status ?? ""] ?? 2;
    const ob = order[b.latestLog?.status ?? ""] ?? 2;
    if (oa !== ob) return oa - ob;
    return b.daysSince - a.daysSince;
  });

  const callbackCount = customers.filter((c) => c.latestLog?.status === "CALLBACK").length;
  const noAnswerCount = customers.filter((c) => c.latestLog?.status === "NO_ANSWER").length;
  const freshCount    = customers.filter((c) => !c.latestLog).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/reorder" className="text-sm text-gray-400 hover:text-gray-600">← Campaigns</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Retail Follow-up</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Retail advance customers whose order was placed 15+ days ago — live list, always updated
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Remaining",   value: customers.length,  color: "text-gray-700" },
          { label: "Follow-up",   value: callbackCount,     color: "text-blue-600" },
          { label: "No Answer",   value: noAnswerCount,     color: "text-yellow-600" },
          { label: "Not Called",  value: freshCount,        color: "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, phone, city..."
          className="flex-1 min-w-[160px] text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />
        {show === "all"
          ? <input type="hidden" name="show" value="all" />
          : null
        }
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Search
        </button>
        {showAll ? (
          <Link href={`/reorder/retail-followup${q ? `?q=${q}` : ""}`} className="text-xs text-blue-600 hover:underline px-2">
            Show pending only
          </Link>
        ) : (
          <Link href={`/reorder/retail-followup?show=all${q ? `&q=${q}` : ""}`} className="text-xs text-gray-400 hover:text-black px-2">
            Show all (including done)
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        {customers.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-gray-400 text-sm">
              {showAll ? "No customers found" : "All customers have been called!"}
            </p>
            {!showAll && allCount > 0 && (
              <Link href="/reorder/retail-followup?show=all" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                Show all {allCount}
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-3 px-4 text-left">#</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-left hidden sm:table-cell">Phone</th>
                <th className="py-3 px-4 text-left hidden md:table-cell">City</th>
                <th className="py-3 px-4 text-left hidden lg:table-cell">Last Order</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c, i) => {
                const log = c.latestLog;
                const st = log ? STATUS_LABELS[log.status] : null;
                return (
                  <tr key={c.phone} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-4 text-gray-300 text-xs">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      <p className="text-sm font-medium text-gray-800">{c.customerName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{c.daysSince} days ago</p>
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 font-mono text-xs hidden sm:table-cell">{c.phone}</td>
                    <td className="py-2.5 px-4 text-gray-400 text-sm hidden md:table-cell">{c.city || "—"}</td>
                    <td className="py-2.5 px-4 text-gray-300 text-xs truncate max-w-[160px] hidden lg:table-cell">{c.lastOrderItems}</td>
                    <td className="py-2.5 px-4">
                      {st ? (
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                          {log?.note && <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[120px]">{log.note}</p>}
                          {log && <p className="text-[11px] text-gray-300 mt-0.5">by {userLabel(log.calledBy)}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <RetailFollowupCallButton
                        phone={c.phone}
                        customerName={c.customerName}
                        lastStatus={log?.status}
                      />
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
