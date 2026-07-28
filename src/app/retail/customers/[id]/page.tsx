import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { deleteRetailCustomer, updateRetailCustomer } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import DeleteButton from "@/components/DeleteButton";
import CopyButton from "@/components/CopyButton";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getSessionUser();
  const isAdmin = me?.isAdmin ?? false;
  const { id } = await params;
  const customerId = parseInt(id, 10);

  const customer = await prisma.retailCustomer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        include: { payments: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const totalBilled = customer.orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalReceived = customer.orders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const balance = Math.max(0, totalBilled - totalReceived);

  const updateBound = updateRetailCustomer.bind(null, customer.id);
  const deleteBound = deleteRetailCustomer.bind(null, customer.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/retail/customers" className="text-sm text-gray-400 hover:text-black">← Customers</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{customer.name}</h1>
          {(customer.phone || customer.city) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {[customer.phone, customer.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {isAdmin && <DeleteButton action={deleteBound} message="This customer will be unlinked from their orders and removed." />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Total Billed</p>
          <p className="text-lg font-semibold">Rs {fmt(totalBilled)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Received</p>
          <p className="text-lg font-semibold text-green-700">Rs {fmt(totalReceived)}</p>
        </div>
        <div className={`rounded-2xl p-4 shadow-sm text-center ${balance > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p className={`text-lg font-semibold ${balance > 0 ? "text-orange-600" : "text-green-700"}`}>
            {balance > 0 ? `Rs ${fmt(balance)}` : "✓ Clear"}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Edit Info</h2>
        <form action={updateBound} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500">Name <span className="text-black">*</span></label>
              <CopyButton value={customer.name} />
            </div>
            <input
              type="text"
              name="name"
              required
              defaultValue={customer.name}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-500">Phone</label>
                <CopyButton value={customer.phone ?? ""} />
              </div>
              <input
                type="tel"
                name="phone"
                defaultValue={customer.phone ?? ""}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-500">City</label>
                <CopyButton value={customer.city ?? ""} />
              </div>
              <input
                type="text"
                name="city"
                defaultValue={customer.city ?? ""}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500">Address</label>
              <CopyButton value={(customer as typeof customer & { address?: string }).address ?? ""} />
            </div>
            <input
              type="text"
              name="address"
              defaultValue={(customer as typeof customer & { address?: string }).address ?? ""}
              placeholder="e.g. Street 5, Block B, Gulberg"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500">Notes</label>
              <CopyButton value={customer.notes ?? ""} />
            </div>
            <textarea
              name="notes"
              rows={2}
              defaultValue={customer.notes ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <SubmitButton
            pendingText="Saving..."
            className="bg-black text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Save Changes
          </SubmitButton>
        </form>
      </div>

      {/* Orders */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Orders ({customer.orders.length})
          </p>
          <Link
            href={`/retail/orders/new`}
            className="text-xs font-medium text-black hover:underline"
          >
            + New Order
          </Link>
        </div>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="py-2 px-5">Order</th>
                <th className="py-2 px-5">Date</th>
                <th className="py-2 px-5 text-right">Total</th>
                <th className="py-2 px-5 text-right">Balance</th>
                <th className="py-2 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customer.orders.map((o) => {
                const rec = o.payments.reduce((s, p) => s + p.amount, 0);
                const bal = Math.max(0, o.totalAmount - rec);
                return (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/retail/orders/${o.id}`} className="font-medium hover:underline">
                        R-{String(o.id).padStart(3, "0")}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{o.date.toISOString().slice(0, 10)}</td>
                    <td className="py-3 px-5 text-right tabular-nums">Rs {fmt(o.totalAmount)}</td>
                    <td className={`py-3 px-5 text-right tabular-nums font-medium ${bal > 0 ? "text-orange-600" : "text-green-700"}`}>
                      {bal > 0 ? `Rs ${fmt(bal)}` : "✓"}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        o.status === "PAID" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"
                      }`}>
                        {o.status === "PAID" ? "Delivered" : "Pending"}
                      </span>
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
