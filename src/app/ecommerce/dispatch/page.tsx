import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DispatchDatePicker from "@/components/DispatchDatePicker";
import PrintButton from "@/app/performance/report/PrintButton";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomDispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { date: dateParam } = await searchParams;
  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const date = dateParam ?? todayPK;

  const dayStart = new Date(`${date}T00:00:00+05:00`);
  const dayEnd = new Date(`${date}T23:59:59+05:00`);

  const orders = await prisma.ecomOrder.findMany({
    where: { dispatchedAt: { gte: dayStart, lte: dayEnd } },
    select: {
      id: true,
      customerName: true,
      phone: true,
      city: true,
      address: true,
      totalAmount: true,
      trackingNumber: true,
      items: { select: { description: true, quantity: true } },
    },
    orderBy: { id: "asc" },
  });

  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl space-y-4 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-[#16202E] tracking-tight">Dispatch List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Select a date and save the list as PDF</p>
        </div>
        <div className="flex items-center gap-2">
          <DispatchDatePicker date={date} />
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block mb-2">
        <p className="text-lg font-bold">The Boundary Shop — Dispatch List</p>
        <p className="text-sm text-gray-600">{dateLabel}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden print:border-black print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium text-left bg-gray-50 print:bg-white print:border-black">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3">City</th>
                <th className="py-2 px-3">Items</th>
                <th className="py-2 px-3">Tracking</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-black">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 px-3 font-semibold text-gray-900">#{o.id}</td>
                  <td className="py-2 px-3">
                    <p className="text-gray-800">{o.customerName}</p>
                    {o.phone && <p className="text-xs text-gray-400 print:text-gray-600">{o.phone}</p>}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{o.city ?? "—"}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">
                    {o.items.length > 0 ? o.items.map((i) => `${i.description} x${i.quantity}`).join(", ") : "—"}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-600">{o.trackingNumber ?? "—"}</td>
                  <td className="py-2 px-3 text-right font-semibold text-gray-900 tabular-nums">Rs {fmt(o.totalAmount)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">
                    No parcels dispatched on this date
                  </td>
                </tr>
              )}
            </tbody>
            {orders.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold print:bg-white print:border-black">
                  <td className="py-2.5 px-3" colSpan={4}>Total ({orders.length} parcels)</td>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-right tabular-nums">Rs {fmt(totalValue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
