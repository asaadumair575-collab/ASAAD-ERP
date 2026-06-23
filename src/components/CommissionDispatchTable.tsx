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
      <div className="border border-gray-200 rounded-2xl p-10 text-center">
        <p className="text-gray-500 text-sm">No commission orders here.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
            <th className="py-3 px-5 font-medium">Order</th>
            <th className="py-3 px-5 font-medium">Order For</th>
            <th className="py-3 px-5 font-medium">Date</th>
            <th className="py-3 px-5 font-medium text-right">Dozens</th>
            <th className="py-3 px-5 font-medium">Notes</th>
            <th className="py-3 px-5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((o) => {
            const toggleBound = setCommissionDispatched.bind(
              null,
              o.id,
              !o.dispatched
            );
            return (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
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
