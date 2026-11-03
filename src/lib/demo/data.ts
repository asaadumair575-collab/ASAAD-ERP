// Dummy data for the e-commerce demo (/demo): a store that subscribed to the
// software, connected Shopify and its couriers, and is receiving orders.
// Nothing here touches the real database — it is generated in the browser
// from a fixed seed, with dates relative to "now" so it always looks live.

export type Courier = "PostEx" | "TCS" | "Leopards";
export const COURIERS: Courier[] = ["PostEx", "TCS", "Leopards"];

export type OrderStatus = "New" | "Confirmed" | "Shipped" | "Delivered" | "Returned" | "Cancelled";
export const ORDER_STATUSES: OrderStatus[] = ["New", "Confirmed", "Shipped", "Delivered", "Returned", "Cancelled"];

export type Product = { id: number; sku: string; name: string; emoji: string; price: number; cost: number; stock: number };
export type Customer = { id: number; name: string; phone: string; city: string; email: string };
export type OrderItem = { productId: number; name: string; qty: number; price: number };
export type TimelineEntry = { status: string; at: string; note?: string };

export type Order = {
  id: number;
  number: string;
  createdAt: string;
  customerId: number;
  address: string;
  items: OrderItem[];
  shippingFee: number;
  discount: number;
  payment: "COD" | "Prepaid";
  status: OrderStatus;
  courier?: Courier;
  tracking?: string;
  courierCharge: number;
  remitted: boolean;
  timeline: TimelineEntry[];
};

export type Integrations = {
  shopify: { connected: boolean; store: string; lastSync: string };
  couriers: Record<Courier, boolean>;
};

export type DemoData = {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  integrations: Integrations;
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

const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Gujranwala", "Sialkot", "Hyderabad", "Quetta", "Bahawalpur"];
const CITY_W = [20, 22, 10, 8, 7, 6, 5, 4, 4, 4, 3, 3];
const FIRST = ["Ayesha", "Fatima", "Hira", "Sana", "Maham", "Zainab", "Areeba", "Mehwish", "Ali", "Ahmed", "Hamza", "Usman", "Bilal", "Saad", "Hassan", "Fahad", "Noor", "Iqra", "Rabia", "Danish"];
const LAST = ["Khan", "Malik", "Sheikh", "Butt", "Raza", "Iqbal", "Qureshi", "Siddiqui", "Mirza", "Ansari", "Chaudhry", "Abbasi"];
const AREAS = ["DHA Phase 5", "Gulberg III", "Model Town", "Johar Town", "Bahria Town", "Clifton Block 2", "Gulshan-e-Iqbal", "F-10 Markaz", "Satellite Town", "Cantt", "Wapda Town", "Garden Town"];

const PRODUCTS: Omit<Product, "id" | "stock">[] = [
  { sku: "TS-BLK-M", name: "Oversized Graphic Tee", emoji: "👕", price: 1890, cost: 820 },
  { sku: "HD-GRY-L", name: "Fleece Hoodie", emoji: "🧥", price: 3990, cost: 1950 },
  { sku: "JG-NVY-32", name: "Cargo Joggers", emoji: "👖", price: 2790, cost: 1300 },
  { sku: "SN-WHT-42", name: "Classic White Sneakers", emoji: "👟", price: 5490, cost: 3100 },
  { sku: "BG-TOTE-01", name: "Canvas Tote Bag", emoji: "👜", price: 1490, cost: 560 },
  { sku: "CP-BLK-01", name: "Embroidered Cap", emoji: "🧢", price: 1290, cost: 480 },
  { sku: "WT-SLV-01", name: "Minimal Steel Watch", emoji: "⌚", price: 4990, cost: 2600 },
  { sku: "SG-BLK-01", name: "Polarized Sunglasses", emoji: "🕶️", price: 2490, cost: 900 },
  { sku: "PF-OUD-50", name: "Oud Perfume 50ml", emoji: "🧴", price: 3490, cost: 1400 },
  { sku: "WL-BRN-01", name: "Leather Wallet", emoji: "👛", price: 1990, cost: 850 },
];

const COURIER_CHARGE: Record<Courier, number> = { PostEx: 230, TCS: 290, Leopards: 250 };

export function trackingFor(courier: Courier, r: () => number) {
  const n = () => Math.floor(r() * 10);
  const digits = (k: number) => Array.from({ length: k }, n).join("");
  return courier === "PostEx" ? `PX${digits(10)}` : courier === "TCS" ? `77${digits(9)}` : `LE${digits(8)}`;
}

export function generateDemoData(seed = 20261103): DemoData {
  const r = rng(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const int = (min: number, max: number) => min + Math.floor(r() * (max - min + 1));
  const weighted = <T,>(items: T[], w: number[]) => {
    let x = r() * w.reduce((s, v) => s + v, 0);
    for (let i = 0; i < items.length; i++) if ((x -= w[i]) <= 0) return items[i];
    return items[items.length - 1];
  };

  const products: Product[] = PRODUCTS.map((p, i) => ({ ...p, id: i + 1, stock: int(25, 220) }));
  products[3].stock = 6;
  products[6].stock = 0;
  products[8].stock = 9;
  const productW = [18, 10, 12, 7, 9, 10, 5, 8, 9, 8];

  const customers: Customer[] = [];
  const now = Date.now();
  const orders: Order[] = [];
  const at = (ms: number) => new Date(ms).toISOString();

  for (let day = 59; day >= 0; day--) {
    // Order volume grows over the two months, a little busier on weekends.
    const date = new Date(now - day * 86400000);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const perDay = Math.round(9 + (59 - day) * 0.22 + (weekend ? 4 : 0) + r() * 5);
    const count = day === 0 ? Math.max(4, Math.round(perDay * (new Date().getHours() / 24))) : perDay;
    for (let k = 0; k < count; k++) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const maxMs = day === 0 ? now - dayStart.getTime() : 86400000;
      const created = dayStart.getTime() + Math.floor((0.35 + r() * 0.65) * maxMs);

      // Returning customers: about a quarter of orders.
      let customer: Customer;
      if (customers.length > 30 && r() < 0.25) customer = pick(customers);
      else {
        customer = {
          id: customers.length + 1,
          name: `${pick(FIRST)} ${pick(LAST)}`,
          phone: `03${int(0, 4)}${int(0, 9)}${int(1000000, 9999999)}`,
          city: weighted(CITIES, CITY_W),
          email: "",
        };
        customer.email = `${customer.name.split(" ")[0].toLowerCase()}${int(10, 99)}@gmail.com`;
        customers.push(customer);
      }

      const items: OrderItem[] = [];
      const lines = r() < 0.7 ? 1 : r() < 0.8 ? 2 : 3;
      while (items.length < lines) {
        const p = weighted(products, productW);
        if (items.some((i) => i.productId === p.id)) continue;
        items.push({ productId: p.id, name: p.name, qty: r() < 0.85 ? 1 : 2, price: p.price });
      }

      const ageH = (now - created) / 3600000;
      let status: OrderStatus;
      if (ageH < 6) status = r() < 0.75 ? "New" : "Confirmed";
      else if (ageH < 24) status = weighted(["New", "Confirmed", "Shipped", "Cancelled"], [15, 35, 45, 5]);
      else if (ageH < 96) status = weighted(["Shipped", "Delivered", "Returned", "Cancelled"], [55, 35, 5, 5]);
      else status = weighted(["Delivered", "Returned", "Cancelled"], [83, 11, 6]);

      const courier = status === "New" || status === "Confirmed" || (status === "Cancelled" && r() < 0.7)
        ? undefined
        : weighted(COURIERS, [50, 25, 25]);
      const id = orders.length + 1;
      const timeline: TimelineEntry[] = [{ status: "Order received from Shopify", at: at(created) }];
      const step = (h: number) => at(Math.min(now, created + h * 3600000));
      if (status !== "New" && status !== "Cancelled") timeline.push({ status: "Confirmed by call", at: step(1 + r() * 3) });
      if (courier) {
        timeline.push({ status: `Booked with ${courier}`, at: step(5 + r() * 10) });
        timeline.push({ status: "Picked up by courier", at: step(18 + r() * 10) });
      }
      if (status === "Delivered") timeline.push({ status: "Delivered", at: step(48 + r() * 72) });
      if (status === "Returned") timeline.push({ status: "Returned to origin", at: step(96 + r() * 72) });
      if (status === "Cancelled") timeline.push({ status: "Cancelled", at: step(2 + r() * 8), note: pick(["Customer not responding", "Fake order", "Customer changed mind"]) });

      orders.push({
        id,
        number: `#${1200 + id}`,
        createdAt: at(created),
        customerId: customer.id,
        address: `House ${int(1, 450)}, ${pick(AREAS)}, ${customer.city}`,
        items,
        shippingFee: 200,
        discount: r() < 0.15 ? 300 : 0,
        payment: r() < 0.82 ? "COD" : "Prepaid",
        status,
        courier,
        tracking: courier ? trackingFor(courier, r) : undefined,
        courierCharge: courier ? COURIER_CHARGE[courier] : 0,
        remitted: status === "Delivered" && ageH > 24 * 9,
        timeline,
      });
    }
  }

  return {
    products,
    customers,
    orders,
    integrations: {
      shopify: { connected: true, store: "yourstore.myshopify.com", lastSync: new Date(now - 4 * 60000).toISOString() },
      couriers: { PostEx: true, TCS: true, Leopards: true },
    },
  };
}

export { COURIER_CHARGE };

export const subtotal = (o: Order) => o.items.reduce((s, i) => s + i.qty * i.price, 0);
export const orderTotal = (o: Order) => subtotal(o) - o.discount + o.shippingFee;
export const itemCount = (o: Order) => o.items.reduce((s, i) => s + i.qty, 0);

// Random new orders for "Sync now" and the live feed, built from the
// current catalogue and customers so they look like the rest of the data.
export function makeIncomingOrders(data: DemoData, count: number): { orders: Order[]; customers: Customer[] } {
  const r = rng(Date.now() % 2147483647);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const customers: Customer[] = [];
  const orders: Order[] = [];
  let nextCustomer = data.customers.reduce((m, c) => Math.max(m, c.id), 0) + 1;
  let nextOrder = data.orders.reduce((m, o) => Math.max(m, o.id), 0) + 1;
  for (let k = 0; k < count; k++) {
    let customer: Customer;
    if (r() < 0.3) customer = pick(data.customers);
    else {
      customer = {
        id: nextCustomer++,
        name: `${pick(FIRST)} ${pick(LAST)}`,
        phone: `03${Math.floor(r() * 5)}${Math.floor(r() * 10)}${Math.floor(1000000 + r() * 8999999)}`,
        city: pick(CITIES),
        email: "",
      };
      customer.email = `${customer.name.split(" ")[0].toLowerCase()}${Math.floor(10 + r() * 89)}@gmail.com`;
      customers.push(customer);
    }
    const p = pick(data.products.filter((x) => x.stock > 0));
    const created = new Date(Date.now() - k * 47000).toISOString();
    orders.push({
      id: nextOrder,
      number: `#${1200 + nextOrder}`,
      createdAt: created,
      customerId: customer.id,
      address: `House ${Math.floor(1 + r() * 450)}, ${pick(AREAS)}, ${customer.city}`,
      items: [{ productId: p.id, name: p.name, qty: 1, price: p.price }],
      shippingFee: 200,
      discount: 0,
      payment: r() < 0.82 ? "COD" : "Prepaid",
      status: "New",
      courierCharge: 0,
      remitted: false,
      timeline: [{ status: "Order received from Shopify", at: created }],
    });
    nextOrder++;
  }
  return { orders, customers };
}
