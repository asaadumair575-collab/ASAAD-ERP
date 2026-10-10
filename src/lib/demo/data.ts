// Dummy data for the public demo ERP (/demo). Nothing here touches the real
// database — it is generated in the browser from a fixed seed so every fresh
// demo looks the same, and dates are relative to "today" so it always looks
// current in a recording.

export type Customer = {
  id: number;
  code: string;
  name: string;
  company: string;
  city: string;
  phone: string;
  email: string;
  createdAt: string;
};

export type Product = { id: number; sku: string; name: string; unit: string; price: number; cost: number };

export type InvoiceItem = { productId: number | null; name: string; qty: number; rate: number };

export type Invoice = {
  id: number;
  number: string;
  customerId: number;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  discount: number;
  taxPercent: number;
  notes: string;
};

export type PaymentMethod = "Bank Transfer" | "Cash" | "Cheque";
export type Payment = { id: number; invoiceId: number; date: string; amount: number; method: PaymentMethod; reference: string };

export type ExpenseCategory = "Rent" | "Salaries" | "Utilities" | "Transport" | "Marketing" | "Office";
export type Expense = { id: number; date: string; category: ExpenseCategory; description: string; amount: number };

export type DemoData = {
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
};

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

const CITIES = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Multan", "Rawalpindi", "Peshawar", "Sialkot"];
const FIRST = ["Ahmed", "Bilal", "Hamza", "Usman", "Zain", "Ali", "Saad", "Fahad", "Imran", "Kashif", "Noman", "Waqas", "Sana", "Ayesha", "Hira", "Farhan"];
const LAST = ["Khan", "Malik", "Sheikh", "Qureshi", "Butt", "Raza", "Iqbal", "Chaudhry", "Siddiqui", "Mirza"];
const COMPANY = ["Traders", "Enterprises", "Distributors", "& Co", "Mart", "Wholesale", "Store", "Suppliers"];

const PRODUCTS: Omit<Product, "id">[] = [
  { sku: "PRD-1001", name: "Premium Cotton T-Shirt", unit: "pcs", price: 850, cost: 520 },
  { sku: "PRD-1002", name: "Classic Denim Jeans", unit: "pcs", price: 2400, cost: 1550 },
  { sku: "PRD-1003", name: "Sports Running Shoes", unit: "pair", price: 4200, cost: 2900 },
  { sku: "PRD-1004", name: "Leather Wallet", unit: "pcs", price: 1200, cost: 650 },
  { sku: "PRD-1005", name: "Stainless Steel Bottle", unit: "pcs", price: 950, cost: 560 },
  { sku: "PRD-1006", name: "Wireless Earbuds", unit: "pcs", price: 3500, cost: 2300 },
  { sku: "PRD-1007", name: "Backpack 30L", unit: "pcs", price: 2800, cost: 1700 },
  { sku: "PRD-1008", name: "Cotton Bedsheet Set", unit: "set", price: 3200, cost: 2100 },
];

export function generateDemoData(seed = 20261010): DemoData {
  const r = rng(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const int = (min: number, max: number) => min + Math.floor(r() * (max - min + 1));

  const products: Product[] = PRODUCTS.map((p, i) => ({ id: i + 1, ...p }));

  const customers: Customer[] = [];
  const used = new Set<string>();
  for (let i = 1; customers.length < 24; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const name = `${first} ${last}`;
    if (used.has(name)) continue;
    used.add(name);
    const city = pick(CITIES);
    customers.push({
      id: customers.length + 1,
      code: `CUS-${String(customers.length + 1).padStart(4, "0")}`,
      name,
      company: `${last} ${pick(COMPANY)}`,
      city,
      phone: `03${int(0, 4)}${int(0, 9)}-${int(1000000, 9999999)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      createdAt: iso(daysAgo(int(200, 380))),
    });
  }
  // A few recently added customers so "new this month" shows up.
  customers.slice(-3).forEach((c, i) => (c.createdAt = iso(daysAgo(3 + i * 4))));

  // Bigger customers order more often.
  const weights = customers.map(() => 0.3 + r() * 1.7);
  const totalW = weights.reduce((s, w) => s + w, 0);
  const pickCustomer = (): Customer => {
    let x = r() * totalW;
    for (let i = 0; i < customers.length; i++) {
      x -= weights[i];
      if (x <= 0) return customers[i];
    }
    return customers[customers.length - 1];
  };

  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let payId = 1;
  for (let day = 360; day >= 0; day--) {
    // Gentle growth over the year plus some noise.
    const perDay = 0.25 + (360 - day) / 360 * 0.45;
    if (r() > perDay) continue;
    const c = pickCustomer();
    if (c.createdAt > iso(daysAgo(day))) continue;
    const lines = int(1, 3);
    const items: InvoiceItem[] = [];
    const chosen = new Set<number>();
    while (items.length < lines) {
      const p = pick(products);
      if (chosen.has(p.id)) continue;
      chosen.add(p.id);
      items.push({ productId: p.id, name: p.name, qty: int(2, 12) * 5, rate: p.price });
    }
    const id = invoices.length + 1;
    const date = daysAgo(day);
    const inv: Invoice = {
      id,
      number: `INV-${String(1000 + id)}`,
      customerId: c.id,
      date: iso(date),
      dueDate: iso(daysAgo(day - 15)),
      items,
      discount: r() < 0.25 ? int(1, 5) * 500 : 0,
      taxPercent: r() < 0.5 ? 0 : 5,
      notes: "",
    };
    invoices.push(inv);

    const total = invoiceTotal(inv);
    // Older invoices are mostly settled; recent ones are often still open.
    const settle = day > 45 ? 0.92 : day > 15 ? 0.55 : 0.25;
    const roll = r();
    const method: PaymentMethod = pick(["Bank Transfer", "Bank Transfer", "Cash", "Cheque"]);
    if (roll < settle) {
      if (r() < 0.3 && day > 10) {
        const first = Math.round(total * 0.5);
        payments.push({ id: payId++, invoiceId: id, date: iso(daysAgo(Math.max(0, day - int(1, 5)))), amount: first, method, reference: ref(r) });
        payments.push({ id: payId++, invoiceId: id, date: iso(daysAgo(Math.max(0, day - int(6, 14)))), amount: total - first, method, reference: ref(r) });
      } else {
        payments.push({ id: payId++, invoiceId: id, date: iso(daysAgo(Math.max(0, day - int(1, 12)))), amount: total, method, reference: ref(r) });
      }
    } else if (roll < settle + 0.2) {
      payments.push({ id: payId++, invoiceId: id, date: iso(daysAgo(Math.max(0, day - int(1, 6)))), amount: Math.round(total * (0.3 + r() * 0.4)), method, reference: ref(r) });
    }
  }

  const expenses: Expense[] = [];
  let expId = 1;
  for (let m = 11; m >= 0; m--) {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() - m);
    const at = (d: number) => {
      const x = new Date(base);
      x.setDate(d);
      return x > new Date() ? null : iso(x);
    };
    const add = (d: number, category: ExpenseCategory, description: string, amount: number) => {
      const date = at(d);
      if (date) expenses.push({ id: expId++, date, category, description, amount });
    };
    add(1, "Rent", "Warehouse rent", 85000);
    add(1, "Rent", "Office rent", 45000);
    add(28, "Salaries", "Staff salaries", 260000 + int(0, 4) * 10000);
    add(10, "Utilities", "Electricity bill", 18000 + int(0, 12000));
    add(12, "Utilities", "Internet & phone", 6500);
    add(int(3, 25), "Transport", "Delivery & courier", 22000 + int(0, 15000));
    add(int(3, 25), "Marketing", "Social media ads", 30000 + int(0, 25000));
    if (r() < 0.6) add(int(3, 25), "Office", "Stationery & supplies", 4000 + int(0, 6000));
  }

  return { customers, products, invoices, payments, expenses };
}

function ref(r: () => number) {
  return `TXN${Math.floor(r() * 9_000_000 + 1_000_000)}`;
}

// ── Calculations shared by every demo page ────────────────────────────────

export function invoiceSubtotal(inv: Invoice) {
  return inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
}

export function invoiceTax(inv: Invoice) {
  return Math.round((invoiceSubtotal(inv) - inv.discount) * (inv.taxPercent / 100));
}

export function invoiceTotal(inv: Invoice) {
  return invoiceSubtotal(inv) - inv.discount + invoiceTax(inv);
}

export type InvoiceStatus = "Paid" | "Partial" | "Unpaid" | "Overdue";

export function invoiceStatus(total: number, paid: number, dueDate: string): InvoiceStatus {
  if (paid >= total - 0.5) return "Paid";
  if (paid > 0) return "Partial";
  return dueDate < iso(new Date()) ? "Overdue" : "Unpaid";
}

export const todayISO = () => iso(new Date());
