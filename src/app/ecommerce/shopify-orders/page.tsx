import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function statusBadge(status: string) {
  if (status === "PAID") return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Delivered</span>;
  if (status === "RETURNED") return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Returned</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Pending</span>;
}

function OrderTable({ orders }: { orders: Awaited<ReturnType<typeof getOrders>> }) {
  if (orders.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
        <p className="text-gray-400 text-sm">No orders in this category.</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide text-left border-b border-gray-100">
              <th className="py-3 px-5">Order</th>
              <th className="py-3 px-5">Customer</th>
              <th className="py-3 px-5">Items</th>
              <th className="py-3 px-5">Date</th>
              <th className="py-3 px-5 text-right">Amount</th>
              <th className="py-3 px-5 text-center">Status</th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="py-3 px-5 font-mono text-xs text-gray-400">{o.notes ?? `#${o.shopifyOrderId}`}</td>
                <td className="py-3 px-5">
                  <p className="font-medium">{o.customerName}</p>
                  {(o.phone || o.city) && (
                    <p className="text-xs text-gray-400">{[o.phone, o.city].filter(Boolean).join(" · ")}</p>
                  )}
                </td>
                <td className="py-3 px-5 text-gray-500 text-xs">
                  {o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}
                </td>
                <td className="py-3 px-5 text-gray-400 text-xs">{o.date.toISOString().slice(0, 10)}</td>
                <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(o.totalAmount)}</td>
                <td className="py-3 px-5 text-center">{statusBadge(o.status)}</td>
                <td className="py-3 px-5 text-right">
                  <Link href={`/ecommerce/orders/${o.id}`} className="text-xs text-blue-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function getOrders(status?: string) {
  return prisma.ecomOrder.findMany({
    where: {
      shopifyOrderId: { not: null },
      ...(status ? { status } : {}),
    },
    include: { items: true },
    orderBy: { date: "desc" },
  });
}

export default async function ShopifyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = tab === "confirmed" ? "confirmed" : "pending";

  const [pending, confirmed] = await Promise.all([
    getOrders("PENDING"),
    getOrders("PAID"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shopify Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Orders imported automatically from your Shopify store.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <Link
          href="/ecommerce/shopify-orders?tab=pending"
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "pending" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pending
          {pending.length > 0 && (
            <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{pending.length}</span>
          )}
        </Link>
        <Link
          href="/ecommerce/shopify-orders?tab=confirmed"
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "confirmed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Confirmed
          {confirmed.length > 0 && (
            <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{confirmed.length}</span>
          )}
        </Link>
      </div>

      <OrderTable orders={activeTab === "confirmed" ? confirmed : pending} />
    </div>
  );
}
