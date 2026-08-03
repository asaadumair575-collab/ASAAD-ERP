import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { userLabel } from "@/lib/userLabel";
import RetailFollowupCallButton from "../RetailFollowupCallButton";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ORDER_RECEIVED: { label: "Ordered ✓",      color: "bg-green-100 text-green-700" },
  CALLBACK:       { label: "Follow-up",       color: "bg-blue-100 text-blue-700" },
  NOT_INTERESTED: { label: "Not Interested",  color: "bg-red-100 text-red-600" },
  NO_ANSWER:      { label: "No Answer",       color: "bg-yellow-100 text-yellow-700" },
};

export default async function RetailCustomerPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone);

  // All orders for this phone
  const orders = await prisma.retailOrder.findMany({
    where: { phone },
    include: { items: true },
    orderBy: { date: "desc" },
  });

  if (orders.length === 0) notFound();

  const customer = orders[0];

  // All followup logs for this phone
  const logs = await prisma.retailFollowupLog.findMany({
    where: { phone },
    orderBy: { calledAt: "desc" },
    include: { calledBy: { select: { displayName: true, username: true, isAdmin: true } } },
  });

  const latestLog = logs[0];

  const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <div>
        <Link href="/reorder/retail-followup" className="text-sm text-gray-400 hover:text-gray-600">
          ← Retail Follow-up
        </Link>
      </div>

      {/* Customer header */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{customer.customerName}</h1>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{phone}</p>
            {customer.city && <p className="text-sm text-gray-400 mt-0.5">{customer.city}</p>}
          </div>
          <RetailFollowupCallButton
            phone={phone}
            customerName={customer.customerName}
            lastStatus={latestLog?.status}
          />
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{orders.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Orders</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700">
              {totalSpent > 0 ? `Rs ${totalSpent.toLocaleString()}` : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Total Spent</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{logs.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Calls Logged</p>
          </div>
        </div>

        {/* Latest followup status */}
        {latestLog && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-gray-400">Latest status:</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[latestLog.status]?.color ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[latestLog.status]?.label ?? latestLog.status}
            </span>
            {latestLog.note && <span className="text-xs text-gray-400">· {latestLog.note}</span>}
          </div>
        )}
      </div>

      {/* Order history */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Order History</h2>
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-700">
                  {new Date(o.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {o.totalAmount != null && o.totalAmount > 0 && (
                  <p className="text-xs font-semibold text-gray-700">Rs {o.totalAmount.toLocaleString()}</p>
                )}
              </div>
              {o.items.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {o.items.map((item, i) => (
                    <li key={i} className="text-xs text-gray-500">
                      {item.description} ×{item.quantity}
                      {item.rate != null ? ` — Rs ${item.rate.toLocaleString()} each` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-300 mt-1">No items recorded</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Call log history */}
      {logs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Call Log</h2>
          <div className="space-y-2">
            {logs.map((l) => {
              const st = STATUS_LABELS[l.status];
              return (
                <div key={l.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st?.color ?? "bg-gray-100 text-gray-600"}`}>
                        {st?.label ?? l.status}
                      </span>
                      {l.note && <span className="text-xs text-gray-500 truncate">{l.note}</span>}
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      {new Date(l.calledAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {new Date(l.calledAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                      {" · by "}
                      {userLabel(l.calledBy)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
