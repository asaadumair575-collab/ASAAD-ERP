import { setCommissionDispatched } from "@/lib/actions";

type CommissionOrder = {
  id: number;
  orderFor: string;
  date: Date;
  dozens: number;
  notes: string | null;
  dispatched: boolean;
};

export default function CommissionDispatchTable({
  orders,
}: {
  orders: CommissionOrder[];
}) {
  if (orders.length === 0) {
    return (
      <div className="border border-gray-200 rounded-2xl p-12 text-center">
        <p className="text-gray-400 text-sm">No commission orders here.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
            <th className="py-3 px-5">Order</th>
            <th className="py-3 px-5">Order For</th>
            <th className="py-3 px-5">Date</th>
            <th className="py-3 px-5 text-right">Dozens</th>
            <th className="py-3 px-5">Notes</th>
            <th className="py-3 px-5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {orders.map((o) => {
            const toggleBound = setCommissionDispatched.bind(
              null,
              o.id,
              !o.dispatched
            );
            return (
              <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="py-3 px-5 font-medium">
                  COM-{String(o.id).padStart(4, "0")}
                </td>
                <td className="py-3 px-5 text-gray-600">{o.orderFor}</td>
                <td className="py-3 px-5 text-gray-600">
                  {o.date.toISOString().slice(0, 10)}
                </td>
                <td className="py-3 px-5 text-right">{o.dozens}</td>
                <td className="py-3 px-5 text-gray-600">{o.notes ?? "—"}</td>
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
