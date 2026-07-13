import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default async function RetailFinancePage() {
  const orders = await prisma.retailOrder.findMany({
    include: { payments: true, items: true },
    orderBy: { date: "asc" },
  });

  const customers = await prisma.retailCustomer.findMany({
    include: { orders: { include: { payments: true } } },
    orderBy: { name: "asc" },
  });

  // Overall KPIs
  const totalBilled = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalReceived = orders.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const totalPending = Math.max(0, totalBilled - totalReceived);
  const advanceCollected = orders.reduce(
    (s, o) => s + (o.deliveryCharge ?? 0),
    0
  );

  // Monthly breakdown
  type MonthRow = { month: string; billed: number; received: number };
  const monthMap = new Map<string, MonthRow>();
  for (const o of orders) {
    const key = o.date.toISOString().slice(0, 7);
    const existing = monthMap.get(key) ?? { month: key, billed: 0, received: 0 };
    existing.billed += o.totalAmount;
    existing.received += o.payments.reduce((s, p) => s + p.amount, 0);
    monthMap.set(key, existing);
  }
  const months = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  // Per-product breakdown from retail order items
  type ProdRow = { name: string; qty: number; revenue: number };
  const prodMap = new Map<string, ProdRow>();
  for (const o of orders) {
    for (const item of o.items) {
      const key = item.description;
      const existing = prodMap.get(key) ?? { name: key, qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += item.quantity * item.rate;
      prodMap.set(key, existing);
    }
  }
  const products = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Customers with outstanding balance
  const customerBalances = customers.map((c) => {
    const billed = c.orders.reduce((s, o) => s + o.totalAmount, 0);
    const received = c.orders.reduce(
      (s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0),
      0
    );
    return { id: c.id, name: c.name, city: c.city, billed, received, balance: Math.max(0, billed - received) };
  }).filter((c) => c.billed > 0).sort((a, b) => b.balance - a.balance);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1).toLocaleString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Retail Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue, recoveries, and customer balances for all COD orders.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Billed</p>
          <p className="text-2xl font-bold tracking-tight">Rs {fmt(totalBilled)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Received</p>
          <p className="text-2xl font-bold tracking-tight text-green-700">Rs {fmt(totalReceived)}</p>
          <p className="text-xs text-gray-400 mt-0.5">incl. Rs {fmt(advanceCollected)} advance</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm ${totalPending > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending Recovery</p>
          <p className={`text-2xl font-bold tracking-tight ${totalPending > 0 ? "text-orange-600" : "text-green-700"}`}>
            Rs {fmt(totalPending)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.filter(o => {
              const rec = o.payments.reduce((s, p) => s + p.amount, 0);
              return o.totalAmount > rec;
            }).length} orders outstanding
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Collection Rate</p>
          <p className="text-2xl font-bold tracking-tight">
            {totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">of total billed collected</p>
        </div>
      </div>

      {/* Monthly breakdown */}
      {months.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Breakdown</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="py-2 px-5">Month</th>
                <th className="py-2 px-5 text-right">Billed</th>
                <th className="py-2 px-5 text-right">Received</th>
                <th className="py-2 px-5 text-right">Pending</th>
                <th className="py-2 px-5 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {months.map((m) => {
                const pending = Math.max(0, m.billed - m.received);
                const rate = m.billed > 0 ? Math.round((m.received / m.billed) * 100) : 0;
                return (
                  <tr key={m.month} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5 font-medium">{formatMonth(m.month)}</td>
                    <td className="py-3 px-5 text-right tabular-nums">Rs {fmt(m.billed)}</td>
                    <td className="py-3 px-5 text-right tabular-nums text-green-700">Rs {fmt(m.received)}</td>
                    <td className={`py-3 px-5 text-right tabular-nums font-medium ${pending > 0 ? "text-orange-600" : "text-green-700"}`}>
                      {pending > 0 ? `Rs ${fmt(pending)}` : "✓"}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        rate >= 90 ? "bg-green-100 text-green-700" :
                        rate >= 50 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-600"
                      }`}>{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer balances */}
        {customerBalances.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Balances</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="py-2 px-5">Customer</th>
                  <th className="py-2 px-5 text-right">Billed</th>
                  <th className="py-2 px-5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customerBalances.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/retail/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                      {c.city && <p className="text-xs text-gray-400">{c.city}</p>}
                    </td>
                    <td className="py-3 px-5 text-right tabular-nums text-gray-500">Rs {fmt(c.billed)}</td>
                    <td className={`py-3 px-5 text-right tabular-nums font-medium ${c.balance > 0 ? "text-orange-600" : "text-green-700"}`}>
                      {c.balance > 0 ? `Rs ${fmt(c.balance)}` : "✓ Clear"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product breakdown */}
        {products.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales by Product</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="py-2 px-5">Product</th>
                  <th className="py-2 px-5 text-right">Units Sold</th>
                  <th className="py-2 px-5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.name} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-5 font-medium">{p.name}</td>
                    <td className="py-3 px-5 text-right tabular-nums text-gray-600">{p.qty.toLocaleString()}</td>
                    <td className="py-3 px-5 text-right tabular-nums font-medium">Rs {fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {orders.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No retail orders yet — finance data will appear here once orders are created.</p>
          <Link href="/retail/orders/new" className="mt-3 inline-block text-sm font-medium text-black hover:underline">
            + Create your first order
          </Link>
        </div>
      )}
    </div>
  );
}
