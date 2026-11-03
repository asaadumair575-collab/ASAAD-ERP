"use client";

import { useOrderRows } from "@/lib/demo/store";
import { Card, PageHeader, Td, Th, fmtDate, money, isoDaysAgo } from "../_components/ui";

const PLANS = [
  { name: "Starter", price: 4999, orders: "Up to 500 orders / month", features: ["Shopify sync", "1 courier", "Dashboard & reports"] },
  { name: "Growth", price: 9999, orders: "Up to 3,000 orders / month", features: ["Shopify sync", "All couriers", "COD & profit tracking", "3 team members"] },
  { name: "Pro", price: 19999, orders: "Unlimited orders", features: ["Everything in Growth", "Unlimited team", "Priority support", "Custom reports"] },
];

export default function BillingPage() {
  const rows = useOrderRows();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const used = rows.filter((r) => r.createdAt >= monthStart).length;
  const limit = 3000;
  const invoices = [0, 1, 2, 3].map((m) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - m);
    return { date: d.toISOString(), number: `SUB-${2400 - m}`, amount: 9999 };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription" subtitle="Your plan, usage and billing." />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Current plan</p>
            <p className="text-2xl font-bold mt-1">Growth <span className="text-base font-medium text-gray-500">· {money(9999)} / month</span></p>
            <p className="text-sm text-emerald-600 font-medium mt-1">● Active — renews on {fmtDate(isoDaysAgo(-18))}</p>
          </div>
          <div className="w-full sm:w-80">
            <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Orders this month</span><span className="font-semibold">{used.toLocaleString()} / {limit.toLocaleString()}</span></div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#F15A24] rounded-full" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} /></div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const current = p.name === "Growth";
          return (
            <Card key={p.name} className={`p-6 flex flex-col ${current ? "ring-2 ring-[#F15A24]" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg">{p.name}</p>
                {current && <span className="text-xs font-semibold text-[#D9480F] bg-[#FFF1EA] px-2 py-0.5 rounded-full">Current</span>}
              </div>
              <p className="text-3xl font-bold mt-3">{money(p.price)}<span className="text-sm font-medium text-gray-500"> /mo</span></p>
              <p className="text-sm text-gray-500 mt-1">{p.orders}</p>
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-emerald-600">✓</span>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={current}
                className={`mt-5 h-10 rounded-xl text-sm font-semibold ${current ? "bg-gray-100 text-gray-400" : "bg-[#F15A24] hover:bg-[#D9480F] text-white"}`}
              >
                {current ? "Your plan" : p.price > 9999 ? "Upgrade" : "Switch plan"}
              </button>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h2 className="text-base font-semibold">Billing History</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-[#FAFBFC] border-y border-gray-100">
            <tr><Th>Invoice</Th><Th>Date</Th><Th>Plan</Th><Th right>Amount</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((i) => (
              <tr key={i.number}>
                <Td className="font-medium">{i.number}</Td>
                <Td className="text-gray-500">{fmtDate(i.date)}</Td>
                <Td>Growth</Td>
                <Td right>{money(i.amount)}</Td>
                <Td><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Paid</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
