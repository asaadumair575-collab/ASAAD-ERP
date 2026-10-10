"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { todayISO, type InvoiceItem } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/store";
import { Button, Card, Field, PageHeader, inputCls, money } from "../../_components/ui";

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoice />
    </Suspense>
  );
}

function NewInvoice() {
  const router = useRouter();
  const params = useSearchParams();
  const customers = useDemo((s) => s.customers);
  const products = useDemo((s) => s.products);
  const addInvoice = useDemo((s) => s.addInvoice);

  const due = new Date();
  due.setDate(due.getDate() + 15);
  const [customerId, setCustomerId] = useState(params.get("customer") ?? "");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(due.toISOString().slice(0, 10));
  const [items, setItems] = useState<InvoiceItem[]>([{ productId: null, name: "", qty: 1, rate: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business!");

  const update = (i: number, patch: Partial<InvoiceItem>) => setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = Math.round((subtotal - discount) * (taxPercent / 100));
  const total = subtotal - discount + tax;
  const valid = customerId && items.some((i) => i.name && i.qty > 0);

  function save() {
    if (!valid) return;
    const id = addInvoice({
      customerId: Number(customerId),
      date,
      dueDate,
      items: items.filter((i) => i.name && i.qty > 0),
      discount,
      taxPercent,
      notes,
    });
    router.push(`/demo/invoices/${id}`);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="New Invoice" subtitle="Pick a customer, add products and save." />

      <Card className="p-6 space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Customer">
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
              ))}
            </select>
          </Field>
          <Field label="Invoice date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></Field>
        </div>

        <div>
          <div className="hidden sm:grid grid-cols-[1fr_90px_120px_120px_32px] gap-3 text-xs font-medium text-gray-500 mb-2 px-1">
            <span>Product</span><span>Qty</span><span>Rate</span><span className="text-right">Amount</span><span />
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_90px_120px_120px_32px] gap-3 items-center">
                <select
                  value={it.productId ?? ""}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === Number(e.target.value));
                    update(i, p ? { productId: p.id, name: p.name, rate: p.price } : { productId: null, name: "" });
                  }}
                  className={`${inputCls} col-span-2 sm:col-span-1`}
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                <input type="number" min={1} value={it.qty || ""} onChange={(e) => update(i, { qty: Number(e.target.value) })} className={inputCls} placeholder="Qty" />
                <input type="number" min={0} value={it.rate || ""} onChange={(e) => update(i, { rate: Number(e.target.value) })} className={inputCls} placeholder="Rate" />
                <span className="text-right font-semibold tabular-nums text-sm">{money(it.qty * it.rate)}</span>
                <button type="button" onClick={() => setItems((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l))} className="text-gray-300 hover:text-red-500 text-lg" aria-label="Remove line">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setItems((l) => [...l, { productId: null, name: "", qty: 1, rate: 0 }])} className="mt-3 text-sm font-semibold text-[#F15A24] hover:text-[#D9480F]">
            + Add line
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${inputCls} h-auto py-2`} /></Field>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount (Rs)"><input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} className={inputCls} placeholder="0" /></Field>
              <Field label="Tax %"><input type="number" min={0} value={taxPercent || ""} onChange={(e) => setTaxPercent(Number(e.target.value))} className={inputCls} placeholder="0" /></Field>
            </div>
            <div className="bg-[#FAFBFC] rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Discount</span><span className="tabular-nums">− {money(discount)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax ({taxPercent}%)</span><span className="tabular-nums">{money(tax)}</span></div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span className="tabular-nums">{money(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" href="/demo/invoices">Cancel</Button>
          <Button onClick={save} disabled={!valid}>Save Invoice</Button>
        </div>
      </Card>
    </div>
  );
}
