import { prisma } from "@/lib/prisma";
import {
  setCommissionRate,
  createCommissionOrder,
  deleteCommissionOrder,
} from "@/lib/actions";
import DeleteButton from "@/components/DeleteButton";
import SubmitButton from "@/components/SubmitButton";
import {
  AmountVisibilityProvider,
  AmountToggleButton,
  Amount,
} from "@/components/AmountVisibility";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CommissionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromRaw, to: toRaw } = await searchParams;
  const from = fromRaw || startOfMonth();
  const to = toRaw || today();

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);

  const rates = await prisma.commissionRate.findMany({
    orderBy: { effectiveFrom: "asc" },
  });
  const currentRate = rates.at(-1)?.ratePerDozen ?? 0;

  function rateFor(date: Date) {
    let rate = rates[0]?.ratePerDozen ?? 0;
    for (const r of rates) {
      if (r.effectiveFrom <= date) rate = r.ratePerDozen;
      else break;
    }
    return rate;
  }

  const orders = await prisma.commissionOrder.findMany({
    where: { date: { gte: fromDate, lte: toDate } },
    orderBy: { date: "desc" },
  });

  const totalDozens = orders.reduce((s, o) => s + o.dozens, 0);
  const totalCommission = orders.reduce(
    (s, o) => s + o.dozens * rateFor(o.date),
    0
  );

  return (
    <AmountVisibilityProvider>
      <div className="max-w-3xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Commission
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Dozens ordered through the company and the commission earned.
            </p>
          </div>
          <AmountToggleButton />
        </div>

        <form
          action={setCommissionRate}
          className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Commission per Dozen
            </label>
            <input
              type="number"
              step="0.01"
              name="ratePerDozen"
              defaultValue={currentRate}
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <SubmitButton className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
            Save Rate
          </SubmitButton>
          <p className="text-xs text-gray-500 w-full">
            The new rate will only apply to future orders — existing orders keep their original rate.
          </p>
        </form>

        <form
          action={createCommissionOrder}
          className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Order For
            </label>
            <input
              type="text"
              name="orderFor"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Dozens
            </label>
            <input
              type="number"
              step="0.01"
              name="dozens"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={today()}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <label className="block text-xs text-gray-500 mb-1.5">
              Notes (optional)
            </label>
            <input
              type="text"
              name="notes"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <SubmitButton
            pendingText="Saving..."
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Log Order
          </SubmitButton>
        </form>

        <form
          method="GET"
          className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">To</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>
          <button
            type="submit"
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Apply
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Orders
            </p>
            <p className="text-2xl font-semibold mt-1">{orders.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Total Dozens
            </p>
            <p className="text-2xl font-semibold mt-1">
              {totalDozens.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-black text-white border border-black rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Commission ({currentRate.toLocaleString()}/dzn)
            </p>
            <p className="text-2xl font-semibold mt-1">
              <Amount
                value={totalCommission.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              />
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm">
              No commission orders in this date range.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Order For</th>
                  <th className="py-3 px-5">Notes</th>
                  <th className="py-3 px-5 text-right">Dozens</th>
                  <th className="py-3 px-5 text-right">Rate/dzn</th>
                  <th className="py-3 px-5 text-right">Commission</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const rate = rateFor(o.date);
                  const deleteBound = deleteCommissionOrder.bind(null, o.id);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-5 text-gray-600">
                        {o.date.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 px-5 font-medium">{o.orderFor}</td>
                      <td className="py-3 px-5 text-gray-600">
                        {o.notes ?? "—"}
                      </td>
                      <td className="py-3 px-5 text-right">{o.dozens}</td>
                      <td className="py-3 px-5 text-right text-gray-500">
                        <Amount value={rate.toLocaleString()} />
                      </td>
                      <td className="py-3 px-5 text-right font-medium">
                        <Amount
                          value={(o.dozens * rate).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        />
                      </td>
                      <td className="py-3 px-5 text-right">
                        <DeleteButton action={deleteBound} message="This commission order will be permanently deleted." />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AmountVisibilityProvider>
  );
}
