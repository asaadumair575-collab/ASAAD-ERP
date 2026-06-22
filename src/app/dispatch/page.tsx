import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { setDispatched } from "@/lib/actions";

export default async function DispatchPage() {
  const orders = await prisma.order.findMany({
    where: { confirmed: true },
    include: { client: true },
    orderBy: { date: "desc" },
  });

  const pending = orders.filter((o) => !o.dispatched);
  const dispatched = orders.filter((o) => o.dispatched);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dispatch</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length} pending · {dispatched.length} dispatched
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">No confirmed invoices yet.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-3 px-5 font-medium">Invoice</th>
                <th className="py-3 px-5 font-medium">Customer</th>
                <th className="py-3 px-5 font-medium">Date</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...pending, ...dispatched].map((o) => {
                const toggleBound = setDispatched.bind(null, o.id, !o.dispatched);
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5">
                      <Link
                        href={`/clients/${o.clientId}/orders/${o.id}`}
                        className="font-medium hover:underline"
                      >
                        INV-{String(o.id).padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-600">{o.client.name}</td>
                    <td className="py-3 px-5 text-gray-600">
                      {o.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 px-5">
                      {o.dispatched ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-black text-white">
                          Dispatched
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                          Not Dispatched
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <form action={toggleBound}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-gray-500 hover:text-black transition-colors"
                        >
                          {o.dispatched ? "Mark Not Dispatched" : "Mark Dispatched"}
                        </button>
                      </form>
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
