"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  COURIER_CHARGE,
  generateDemoData,
  makeIncomingOrders,
  orderTotal,
  trackingFor,
  type Courier,
  type Customer,
  type DemoData,
  type Order,
} from "./data";

// The demo's whole "database" lives in the viewer's browser (localStorage):
// whatever a prospect does in it stays on their machine and never reaches
// the real ERP data.

// Demo login — shared with prospects along with the link.
export const DEMO_LOGIN = { email: "demo@yourcompany.com", password: "demo123" };

export type Toast = { id: number; text: string };

type DemoState = DemoData & {
  loggedIn: boolean;
  unread: number;
  toasts: Toast[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  syncShopify: (count?: number) => number;
  confirmOrder: (id: number) => void;
  cancelOrder: (id: number) => void;
  bookOrders: (ids: number[], courier: Courier) => void;
  markDelivered: (id: number) => void;
  markReturned: (id: number) => void;
  setCourierConnected: (c: Courier, on: boolean) => void;
  setShopifyConnected: (on: boolean) => void;
  clearUnread: () => void;
  toast: (text: string) => void;
  dismissToast: (id: number) => void;
  reset: () => void;
};

const nowISO = () => new Date().toISOString();

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => {
      const updateOrder = (id: number, fn: (o: Order) => Order) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? fn(o) : o)) }));
      return {
        ...generateDemoData(),
        loggedIn: false,
        unread: 0,
        toasts: [],
        login: (email, password) => {
          const ok = email.trim().toLowerCase() === DEMO_LOGIN.email && password === DEMO_LOGIN.password;
          if (ok) set({ loggedIn: true });
          return ok;
        },
        logout: () => set({ loggedIn: false }),
        syncShopify: (count) => {
          const s = get();
          if (!s.integrations.shopify.connected) return 0;
          const n = count ?? 1 + Math.floor(Math.random() * 3);
          const incoming = makeIncomingOrders(s, n);
          set((st) => ({
            orders: [...st.orders, ...incoming.orders],
            customers: [...st.customers, ...incoming.customers],
            unread: st.unread + n,
            integrations: { ...st.integrations, shopify: { ...st.integrations.shopify, lastSync: nowISO() } },
            products: st.products.map((p) => {
              const sold = incoming.orders.reduce((q, o) => q + o.items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.qty, 0), 0);
              return sold ? { ...p, stock: Math.max(0, p.stock - sold) } : p;
            }),
          }));
          return n;
        },
        confirmOrder: (id) =>
          updateOrder(id, (o) => (o.status === "New" ? { ...o, status: "Confirmed", timeline: [...o.timeline, { status: "Confirmed by call", at: nowISO() }] } : o)),
        cancelOrder: (id) =>
          updateOrder(id, (o) =>
            o.status === "New" || o.status === "Confirmed" ? { ...o, status: "Cancelled", timeline: [...o.timeline, { status: "Cancelled", at: nowISO() }] } : o,
          ),
        bookOrders: (ids, courier) => {
          const r = Math.random;
          set((s) => ({
            orders: s.orders.map((o) =>
              ids.includes(o.id) && (o.status === "Confirmed" || o.status === "New")
                ? {
                    ...o,
                    status: "Shipped",
                    courier,
                    tracking: trackingFor(courier, r),
                    courierCharge: COURIER_CHARGE[courier],
                    timeline: [
                      ...o.timeline,
                      ...(o.status === "New" ? [{ status: "Confirmed by call", at: nowISO() }] : []),
                      { status: `Booked with ${courier}`, at: nowISO() },
                    ],
                  }
                : o,
            ),
          }));
        },
        markDelivered: (id) =>
          updateOrder(id, (o) => (o.status === "Shipped" ? { ...o, status: "Delivered", timeline: [...o.timeline, { status: "Delivered", at: nowISO() }] } : o)),
        markReturned: (id) =>
          updateOrder(id, (o) => (o.status === "Shipped" ? { ...o, status: "Returned", timeline: [...o.timeline, { status: "Returned to origin", at: nowISO() }] } : o)),
        setCourierConnected: (c, on) => set((s) => ({ integrations: { ...s.integrations, couriers: { ...s.integrations.couriers, [c]: on } } })),
        setShopifyConnected: (on) =>
          set((s) => ({ integrations: { ...s.integrations, shopify: { ...s.integrations.shopify, connected: on, lastSync: on ? nowISO() : s.integrations.shopify.lastSync } } })),
        clearUnread: () => set({ unread: 0 }),
        toast: (text) => {
          const id = Date.now() + Math.random();
          set((s) => ({ toasts: [...s.toasts, { id, text }] }));
          setTimeout(() => get().dismissToast(id), 4500);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        reset: () => set({ ...generateDemoData(), unread: 0 }),
      };
    },
    {
      name: "ecom-demo-v1",
      skipHydration: true,
      partialize: (s) => ({ products: s.products, customers: s.customers, orders: s.orders, integrations: s.integrations, loggedIn: s.loggedIn }),
    },
  ),
);

export function useDemoReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(useDemo.persist.rehydrate()).then(() => setReady(true));
  }, []);
  return ready;
}

export type OrderRow = Order & { customer: Customer | undefined; total: number };

export function useOrderRows(): OrderRow[] {
  const orders = useDemo((s) => s.orders);
  const customers = useDemo((s) => s.customers);
  return useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c]));
    return orders
      .map((o) => ({ ...o, customer: byId.get(o.customerId), total: orderTotal(o) }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [orders, customers]);
}
