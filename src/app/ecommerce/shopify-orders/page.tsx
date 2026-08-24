import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ConfirmDraftButton from "@/components/ConfirmDraftButton";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function DraftOrdersPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const orders = await prisma.ecomOrder.findMany({
    where: { draft: true },
    include: { items: true },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Draft Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Orders imported from Shopify — confirm to move them to Ecommerce Orders.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="text-base font-semibold text-gray-700">No draft orders</p>
          <p className="text-sm text-gray-400 mt-1">New Shopify orders will appear here automatically.</p>
        </div>
      ) : (
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
                  <th className="py-3 px-5 text-center">Action</th>
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
                    <td className="py-3 px-5 text-center">
                      <ConfirmDraftButton id={o.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
