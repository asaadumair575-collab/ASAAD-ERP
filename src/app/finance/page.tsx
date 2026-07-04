import { prisma } from "@/lib/prisma";
import { setCostPerDozen } from "@/lib/actions";
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

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromRaw, to: toRaw } = await searchParams;
  const from = fromRaw || startOfMonth();
  const to = toRaw || today();

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);

  const costRates = await prisma.costRate.findMany({
    orderBy: { effectiveFrom: "asc" },
  });
  const currentCostPerDozen = costRates.at(-1)?.costPerDozen ?? 1550;

  function rateFor(date: Date) {
    let rate = costRates[0]?.costPerDozen ?? 1550;
    for (const cr of costRates) {
      if (cr.effectiveFrom <= date) rate = cr.costPerDozen;
      else break;
    }
    return rate;
  }

  const ordersInRange = await prisma.order.findMany({
    where: { date: { gte: fromDate, lte: toDate } },
    include: { items: true },
    orderBy: { date: "desc" },
  });

  const confirmedOrders = ordersInRange.filter((o) => o.confirmed);
  const holdOrders = ordersInRange.filter((o) => !o.confirmed);

  const totalSales = confirmedOrders.reduce((s, o) => s + o.saleAmount, 0);
  const totalDozens = confirmedOrders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0),
    0
  );
  const totalCost = confirmedOrders.reduce((s, o) => {
    const dozens = o.items.reduce((is, i) => is + i.quantity, 0);
    return s + dozens * rateFor(o.date);
  }, 0);
  const profit = totalSales - totalCost;

  return (
    <AmountVisibilityProvider>
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sales and profit from confirmed orders, by dozen.
          </p>
        </div>
        <AmountToggleButton />
      </div>

      <form
        action={setCostPerDozen}
        className="flex flex-wrap gap-3 items-end bg-gray-50 border border-gray-200 rounded-2xl p-5"
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Cost per Dozen
          </label>
          <input
            type="number"
            step="0.01"
            name="costPerDozen"
            defaultValue={currentCostPerDozen}
            required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <SubmitButton className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          Save Rate
        </SubmitButton>
        <p className="text-xs text-gray-500 w-full">
          Naya rate sirf is se aage ki invoices par lagega — pehle ki invoices apne purane rate par hi rahengi.
        </p>
      </form>

      <form
        method="GET"
        className="flex flex-wrap gap-3 items-end bg-gray-50 border border-gray-200 rounded-2xl p-5"
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Confirmed Invoices
          </p>
          <p className="text-2xl font-semibold mt-1">{confirmedOrders.length}</p>
        </div>
        <div className="border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            On Hold
          </p>
          <p className="text-2xl font-semibold mt-1">{holdOrders.length}</p>
        </div>
        <div className="border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Total Dozens
          </p>
          <p className="text-2xl font-semibold mt-1">
            {totalDozens.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Cost (current rate {currentCostPerDozen.toLocaleString()}/dzn)
          </p>
          <p className="text-2xl font-semibold mt-1">
            <Amount value={totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
          </p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl p-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Sales (confirmed only)</span>
          <span className="font-medium">
            <Amount value={totalSales.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Cost</span>
          <span className="font-medium">
            <Amount value={totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
          </span>
        </div>
        <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
          <span>Profit</span>
          <span className={profit < 0 ? "text-red-600" : ""}>
            <Amount value={profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
          </span>
        </div>
      </div>

      {confirmedOrders.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm">
            No confirmed invoices in this date range.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Invoice</th>
                <th className="py-3 px-5 text-right">Dozens</th>
                <th className="py-3 px-5 text-right">Rate/dzn</th>
                <th className="py-3 px-5 text-right">Sale Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {confirmedOrders.map((o) => {
                const dozens = o.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={o.id}>
                    <td className="py-3 px-5 text-gray-600">
                      {o.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 px-5 font-medium">
                      INV-{String(o.id).padStart(4, "0")}
                    </td>
                    <td className="py-3 px-5 text-right">{dozens}</td>
                    <td className="py-3 px-5 text-right text-gray-500">
                      <Amount value={rateFor(o.date).toLocaleString()} />
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Amount value={o.saleAmount.toLocaleString()} />
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
