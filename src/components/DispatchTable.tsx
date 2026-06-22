import Link from "next/link";
import { setDispatched } from "@/lib/actions";

type Order = {
  id: number;
  clientId: number;
  date: Date;
  dispatched: boolean;
  client: { name: string };
};

export default function DispatchTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="border border-gray-200 rounded-2xl p-10 text-center">
        <p className="text-gray-500 text-sm">No invoices here.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
            <th className="py-3 px-5 font-medium">Invoice</th>
            <th className="py-3 px-5 font-medium">Customer</th>
            <th className="py-3 px-5 font-medium">Date</th>
            <th className="py-3 px-5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((o) => {
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
  );
}
