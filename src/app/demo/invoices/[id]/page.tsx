"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { invoiceSubtotal, invoiceTax, todayISO, type PaymentMethod } from "@/lib/demo/data";
import { useDemo, useInvoiceRows } from "@/lib/demo/store";
import { CompanyLogo } from "../../_components/DemoShell";
import { Button, Card, CardTitle, Field, Modal, StatusBadge, fmtDate, inputCls, money } from "../../_components/ui";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const rows = useInvoiceRows();
  const allPayments = useDemo((s) => s.payments);
  const addPayment = useDemo((s) => s.addPayment);
  const [paying, setPaying] = useState(false);

  const inv = rows.find((r) => r.id === Number(id));
  if (!inv) return <p className="text-gray-500">Invoice not found. <Link href="/demo/invoices" className="text-[#F15A24]">Back to invoices</Link></p>;
  const payments = allPayments.filter((p) => p.invoiceId === inv.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const c = inv.customer;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/demo/invoices" className="text-sm text-gray-400 hover:text-gray-700">← Invoices</Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>Print / PDF</Button>
          {inv.balance > 0 && <Button onClick={() => setPaying(true)}>Record Payment</Button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2 p-6 sm:p-10 print:shadow-none print:border-0">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <CompanyLogo size={44} />
              <div>
                <p className="text-lg font-bold text-gray-900">Your Company</p>
                <p className="text-xs text-gray-500">123 Business Avenue, Lahore</p>
                <p className="text-xs text-gray-500">info@yourcompany.com · 0300-0000000</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tracking-tight text-gray-900">INVOICE</p>
              <p className="text-sm text-gray-500 mt-1"># {inv.number}</p>
              <div className="mt-2"><StatusBadge status={inv.status} /></div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mt-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Bill To</p>
              <p className="font-semibold text-gray-900">{c?.name}</p>
              <p className="text-sm text-gray-500">{c?.company}</p>
              <p className="text-sm text-gray-500">{c?.city} · {c?.phone}</p>
            </div>
            <div className="sm:text-right text-sm space-y-1">
              <p><span className="text-gray-400">Invoice date: </span>{fmtDate(inv.date)}</p>
              <p><span className="text-gray-400">Due date: </span>{fmtDate(inv.dueDate)}</p>
              <p className="font-semibold"><span className="text-gray-400 font-normal">Balance due: </span>{money(inv.balance)}</p>
            </div>
          </div>

          <table className="w-full text-sm mt-8">
            <thead>
              <tr className="bg-[#F15A24] text-white">
                <th className="text-left font-medium py-2.5 px-3 rounded-l-lg">Item</th>
                <th className="text-right font-medium py-2.5 px-3">Qty</th>
                <th className="text-right font-medium py-2.5 px-3">Rate</th>
                <th className="text-right font-medium py-2.5 px-3 rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inv.items.map((it, i) => (
                <tr key={i}>
                  <td className="py-3 px-3">{it.name}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{it.qty}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{money(it.rate)}</td>
                  <td className="py-3 px-3 text-right tabular-nums font-medium">{money(it.qty * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-6">
            <div className="w-full sm:w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="tabular-nums">{money(invoiceSubtotal(inv))}</span></div>
              {inv.discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span className="tabular-nums">− {money(inv.discount)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>Tax ({inv.taxPercent}%)</span><span className="tabular-nums">{money(invoiceTax(inv))}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><span>Total</span><span className="tabular-nums">{money(inv.total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span className="tabular-nums">{money(inv.paid)}</span></div>
              <div className="flex justify-between font-semibold text-[#D9480F]"><span>Balance</span><span className="tabular-nums">{money(inv.balance)}</span></div>
            </div>
          </div>

          {inv.notes && <p className="text-sm text-gray-500 mt-8 border-t border-gray-100 pt-4">{inv.notes}</p>}
        </Card>

        <Card className="print:hidden">
          <CardTitle>Payment History</CardTitle>
          <div className="px-5 pb-5 space-y-3">
            {payments.length === 0 && <p className="text-sm text-gray-400">No payments yet.</p>}
            {payments.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 border border-gray-100 rounded-xl p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{money(p.amount)}</p>
                  <p className="text-xs text-gray-400">{p.method} · {p.reference}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(p.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {paying && (
        <Modal title="Record Payment" onClose={() => setPaying(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const amount = Math.min(Number(f.get("amount")), inv.balance);
              if (!(amount > 0)) return;
              addPayment({
                invoiceId: inv.id,
                amount,
                date: String(f.get("date")),
                method: String(f.get("method")) as PaymentMethod,
                reference: String(f.get("reference") ?? "").trim() || "—",
              });
              setPaying(false);
            }}
          >
            <Field label={`Amount (balance ${money(inv.balance)})`}>
              <input name="amount" type="number" min={1} max={inv.balance} defaultValue={inv.balance} required className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><input name="date" type="date" defaultValue={todayISO()} className={inputCls} /></Field>
              <Field label="Method">
                <select name="method" className={inputCls}>
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                </select>
              </Field>
            </div>
            <Field label="Reference (optional)"><input name="reference" className={inputCls} placeholder="Transaction / cheque no." /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPaying(false)}>Cancel</Button>
              <Button type="submit">Save Payment</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
