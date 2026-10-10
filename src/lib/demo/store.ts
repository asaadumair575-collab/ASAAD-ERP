"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateDemoData,
  invoiceStatus,
  invoiceTotal,
  type Customer,
  type DemoData,
  type Expense,
  type Invoice,
  type InvoiceStatus,
  type Payment,
} from "./data";

// The demo's whole "database" lives in the viewer's browser (localStorage),
// so anything created while recording a video stays on that machine and
// never reaches the real ERP data.

type DemoState = DemoData & {
  addCustomer: (c: Omit<Customer, "id" | "code" | "createdAt">) => number;
  addInvoice: (inv: Omit<Invoice, "id" | "number">) => number;
  addPayment: (p: Omit<Payment, "id">) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  reset: () => void;
};

const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => ({
      ...generateDemoData(),
      addCustomer: (c) => {
        const id = nextId(get().customers);
        set((s) => ({
          customers: [...s.customers, { ...c, id, code: `CUS-${String(id).padStart(4, "0")}`, createdAt: new Date().toISOString().slice(0, 10) }],
        }));
        return id;
      },
      addInvoice: (inv) => {
        const id = nextId(get().invoices);
        set((s) => ({ invoices: [...s.invoices, { ...inv, id, number: `INV-${1000 + id}` }] }));
        return id;
      },
      addPayment: (p) => set((s) => ({ payments: [...s.payments, { ...p, id: nextId(s.payments) }] })),
      addExpense: (e) => set((s) => ({ expenses: [...s.expenses, { ...e, id: nextId(s.expenses) }] })),
      reset: () => set(generateDemoData()),
    }),
    { name: "demo-erp-v1", skipHydration: true },
  ),
);

// Rehydrate from localStorage on the client only, and tell pages when it's
// safe to render (avoids a server/client mismatch flash).
export function useDemoReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(useDemo.persist.rehydrate()).then(() => setReady(true));
  }, []);
  return ready;
}

export type InvoiceRow = Invoice & {
  customer: Customer | undefined;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
};

export function useInvoiceRows(): InvoiceRow[] {
  const invoices = useDemo((s) => s.invoices);
  const payments = useDemo((s) => s.payments);
  const customers = useDemo((s) => s.customers);
  return useMemo(() => {
    const paidBy = new Map<number, number>();
    for (const p of payments) paidBy.set(p.invoiceId, (paidBy.get(p.invoiceId) ?? 0) + p.amount);
    const byId = new Map(customers.map((c) => [c.id, c]));
    return invoices
      .map((inv) => {
        const total = invoiceTotal(inv);
        const paid = paidBy.get(inv.id) ?? 0;
        return { ...inv, customer: byId.get(inv.customerId), total, paid, balance: Math.max(0, total - paid), status: invoiceStatus(total, paid, inv.dueDate) };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  }, [invoices, payments, customers]);
}
