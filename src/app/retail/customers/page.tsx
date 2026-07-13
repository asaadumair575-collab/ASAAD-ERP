import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteRetailCustomer } from "@/lib/actions";
import DeleteButton from "@/components/DeleteButton";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailCustomersPage() {
  const customers = await prisma.retailCustomer.findMany({
    include: {
      orders: { include: { payments: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retail Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} retail customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/retail/customers/new"
          className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add Customer
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">Koi retail customer nahi.</p>
          <Link href="/retail/customers/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">
            + Pehla customer add karo
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Phone</th>
                <th className="py-3 px-5">City</th>
                <th className="py-3 px-5 text-right">Orders</th>
                <th className="py-3 px-5 text-right">Total Billed</th>
                <th className="py-3 px-5 text-right">Received</th>
                <th className="py-3 px-5 text-right">Balance</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => {
                const totalBilled = c.orders.reduce((s, o) => s + o.totalAmount, 0);
                const totalReceived = c.orders.reduce(
                  (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0), 0
                );
                const balance = Math.max(0, totalBilled - totalReceived);
                const deleteBound = deleteRetailCustomer.bind(null, c.id);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/retail/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{c.phone ?? "—"}</td>
                    <td className="py-3 px-5 text-gray-500">{c.city ?? "—"}</td>
                    <td className="py-3 px-5 text-right text-gray-600">{c.orders.length}</td>
                    <td className="py-3 px-5 text-right tabular-nums">Rs {fmt(totalBilled)}</td>
                    <td className="py-3 px-5 text-right tabular-nums text-gray-600">Rs {fmt(totalReceived)}</td>
                    <td className={`py-3 px-5 text-right tabular-nums font-medium ${balance > 0 ? "text-orange-600" : "text-green-700"}`}>
                      {balance > 0 ? `Rs ${fmt(balance)}` : "✓"}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <DeleteButton action={deleteBound} message="Ye customer aur unke orders ka link remove ho jayega." />
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
