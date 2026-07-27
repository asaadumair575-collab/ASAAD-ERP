import { prisma } from "@/lib/prisma";
import { createEcomExpense, deleteEcomExpense } from "@/lib/actions";
import EcomExpenseForm from "@/components/EcomExpenseForm";
import DateRangeFilter from "@/components/DateRangeFilter";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

const CATEGORY_COLORS: Record<string, string> = {
  Ads:                "bg-purple-100 text-purple-700",
  "Agency Commission":"bg-blue-100 text-blue-700",
  Shopify:            "bg-green-100 text-green-700",
  Other:              "bg-gray-100 text-gray-500",
};

export default async function EcomExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const expenses = await prisma.ecomExpense.findMany({
    where: {
      ...(fromDate || toDate
        ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const fixedExpenses = expenses.filter((e) => e.type === "FIXED");
  const variableExpenses = expenses.filter((e) => e.type !== "FIXED");

  const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const variableTotal = variableExpenses.reduce((s, e) => s + e.amount, 0);
  const grandTotal = fixedTotal + variableTotal;

  // Group variable expenses by date
  const groups = new Map<string, typeof variableExpenses>();
  for (const e of variableExpenses) {
    const key = e.date.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ecommerce Expenses</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fixed costs entered once · Variable (Ads) added daily — both divided across orders in Finance
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl shadow-sm p-2.5">
        <DateRangeFilter from={from} to={to} />
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">Filter</button>
        {(from || to) && <a href="/ecommerce/expenses" className="text-sm text-gray-400 hover:text-black px-2">Clear</a>}
      </form>

      {/* Add expense form */}
      <EcomExpenseForm action={createEcomExpense} />

      {/* Summary cards */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-medium text-purple-600">Variable (Ads)</p>
            <p className="text-xl font-bold text-purple-700 mt-1">Rs {fmt(variableTotal)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-medium text-blue-600">Fixed Costs</p>
            <p className="text-xl font-bold text-blue-700 mt-1">Rs {fmt(fixedTotal)}</p>
          </div>
          <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400">Total</p>
            <p className="text-xl font-bold mt-1">Rs {fmt(grandTotal)}</p>
          </div>
        </div>
      )}

      {/* Fixed expenses */}
      {fixedExpenses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Fixed Costs</p>
            <p className="text-sm font-semibold text-gray-700">Rs {fmt(fixedTotal)}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {fixedExpenses.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] ?? "bg-gray-100 text-gray-500"}`}>
                    {e.category}
                  </span>
                  <span className="text-xs text-gray-400">{e.date.toISOString().slice(0, 7)}</span>
                  {e.note && <span className="text-sm text-gray-500">{e.note}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">Rs {fmt(e.amount)}</span>
                  <form action={deleteEcomExpense.bind(null, e.id)}>
                    <button type="submit" className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variable expenses grouped by date */}
      {sortedDates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide px-1">Variable Expenses (Daily)</p>
          {sortedDates.map((date) => {
            const dayExpenses = groups.get(date)!;
            const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">{date}</p>
                  <p className="text-sm font-semibold text-gray-700">Rs {fmt(dayTotal)}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {dayExpenses.map((e) => (
                    <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] ?? "bg-gray-100 text-gray-500"}`}>
                          {e.category}
                        </span>
                        {e.note && <span className="text-sm text-gray-500">{e.note}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums">Rs {fmt(e.amount)}</span>
                        <form action={deleteEcomExpense.bind(null, e.id)}>
                          <button type="submit" className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expenses.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No expenses logged yet.</p>
        </div>
      )}
    </div>
  );
}
