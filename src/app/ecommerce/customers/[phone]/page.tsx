import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function EcomCustomerDetailPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone } = await params;
  const decoded = decodeURIComponent(phone);

  const orders = await prisma.ecomOrder.findMany({
    where: decoded.startsWith("name:")
      ? { customerName: { equals: decoded.slice(5), mode: "insensitive" }, phone: null }
      : { phone: decoded },
    orderBy: { date: "desc" },
    include: { items: true },
  });

  if (orders.length === 0) notFound();

  const latest = orders[0];
  const totalOrders = orders.length;
  const delivered = orders.filter((o) => !o.returned && o.status === "PAID");
  const returned = orders.filter((o) => o.returned);
  const totalSpent = delivered.reduce((s, o) => s + o.totalAmount, 0);
  const returnRate = totalOrders > 0 ? Math.round((returned.length / totalOrders) * 100) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/ecommerce/customers" className="text-sm text-gray-400 hover:text-black">← Customers</Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">{latest.customerName}</h1>
      </div>

      {/* Contact Info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Contact Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Phone</p>
            <p className="font-medium">{latest.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">City</p>
            <p className="font-medium">{latest.city ?? "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-0.5">Delivery Address</p>
            <p className="text-sm text-gray-700">{latest.address ?? "—"}</p>
          </div>
          {latest.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-600">{latest.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Total Orders</p>
          <p className="text-xl font-semibold">{totalOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Delivered</p>
          <p className="text-xl font-semibold text-green-700">{delivered.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Returned</p>
          <p className="text-xl font-semibold text-red-600">{returned.length}</p>
        </div>
        <div className={`rounded-2xl p-4 shadow-sm text-center border ${returnRate > 30 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Return Rate</p>
          <p className={`text-xl font-semibold ${returnRate > 30 ? "text-red-600" : "text-gray-700"}`}>{returnRate}%</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
        <p className="text-xs text-gray-500 mb-1">Total Spent (delivered)</p>
        <p className="text-2xl font-semibold">Rs {fmt(totalSpent)}</p>
      </div>

      {/* Order History */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order History</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left">
              <th className="py-2 px-5">Order</th>
              <th className="py-2 px-5">Date</th>
              <th className="py-2 px-5">Items</th>
              <th className="py-2 px-5 text-right">Amount</th>
              <th className="py-2 px-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="py-2.5 px-5">
                  <Link href={`/ecommerce/orders/${o.id}`} className="font-mono text-xs font-medium hover:underline text-gray-700">
                    {o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`}
                  </Link>
                </td>
                <td className="py-2.5 px-5 text-gray-400 text-xs">{o.date.toISOString().slice(0, 10)}</td>
                <td className="py-2.5 px-5 text-gray-500 text-xs">{o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</td>
                <td className="py-2.5 px-5 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                <td className="py-2.5 px-5 text-right">
                  {o.returned ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Returned</span>
                  ) : o.status === "PAID" ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Delivered</span>
                  ) : o.status === "PARTIAL" ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Partial</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
