import { Megaphone, Package, Receipt, Wallet } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import ResultForm from "@/components/ResultForm";
import { Card, CardHeader, Empty, Field, PageHeader, Stat, Table, Td, Th, btn, inputCls, selectCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysAgo, fmtDate, money } from "@/lib/format";
import { addExpense, deleteExpense } from "../actions";

const CATEGORIES = ["Facebook / Instagram ads", "TikTok ads", "Google ads", "Packaging", "Salaries", "Rent & utilities", "Photography / content", "Software & apps", "Other"];

export default async function ExpensesPage() {
  const user = await requireUser();
  const t = user.tenantId;
  const since = daysAgo(30);
  const [list, byCat, orders30] = await Promise.all([
    db.expense.findMany({ where: { tenantId: t }, orderBy: [{ date: "desc" }, { id: "desc" }], take: 200 }),
    db.expense.groupBy({ by: ["category"], where: { tenantId: t, date: { gte: since } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } } }),
    db.order.count({ where: { tenantId: t, placedAt: { gte: since }, status: { not: "CANCELLED" } } }),
  ]);
  const total = byCat.reduce((s, c) => s + (c._sum.amount ?? 0), 0);
  const ads = byCat.filter((c) => /ads/i.test(c.category)).reduce((s, c) => s + (c._sum.amount ?? 0), 0);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Ads, packaging, salaries and other running costs — taken off your profit so you see what you really earn." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Wallet} label="Spent (30 days)" value={money(total)} />
        <Stat icon={Megaphone} chip="violet" label="Ad spend (30 days)" value={money(ads)} />
        <Stat icon={Receipt} chip="amber" label="Cost per order (ads)" value={orders30 ? money(ads / orders30) : "—"} hint={`${orders30} orders`} />
        <Stat icon={Package} chip="blue" label="Total cost per order" value={orders30 ? money(total / orders30) : "—"} />
      </div>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Add an expense" />
            <div className="px-5 pb-5">
              <ResultForm action={addExpense} submitLabel="Add expense">
                <Field label="Category">
                  <select name="category" className={`${selectCls} w-full`}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (Rs)"><input name="amount" type="number" min="1" step="any" required className={inputCls} /></Field>
                  <Field label="Date"><input name="date" type="date" defaultValue={today} required className={inputCls} /></Field>
                </div>
                <Field label="Note (optional)"><input name="note" placeholder="e.g. Eid campaign" className={inputCls} /></Field>
              </ResultForm>
            </div>
          </Card>
          <Card>
            <CardHeader title="Last 30 days by category" />
            <div className="px-5 pb-5 space-y-3">
              {byCat.length ? byCat.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-700">{c.category}</span><span className="font-semibold tabular-nums">{money(c._sum.amount ?? 0)}</span></div>
                  <div className="h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full bg-gray-950" style={{ width: `${((c._sum.amount ?? 0) / (total || 1)) * 100}%` }} /></div>
                </div>
              )) : <p className="text-sm text-gray-500">Nothing yet.</p>}
            </div>
          </Card>
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="All expenses" />
          {list.length === 0 ? <Empty title="No expenses yet">Add your ad spend and other costs to see real net profit on the dashboard.</Empty> : (
            <Table>
              <thead><tr><Th>Date</Th><Th>Category</Th><Th>Note</Th><Th right>Amount</Th><Th /></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <Td className="text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</Td>
                    <Td className="font-medium">{e.category}</Td>
                    <Td className="text-gray-600">{e.note ?? "—"}{e.by && <span className="block text-xs text-gray-400">by {e.by}</span>}</Td>
                    <Td right className="font-medium">{money(e.amount)}</Td>
                    <Td right>
                      <form action={deleteExpense.bind(null, e.id)}>
                        <ConfirmButton message="Delete this expense?" className={btn("ghost", "sm")}>Delete</ConfirmButton>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
