import type { OrderStatus, ShipmentStatus } from "@/generated/prisma/client";
import { adapters } from "./couriers";
import { db } from "./db";

// Fills a demo account with realistic sample data: products, customers and
// ~6 weeks of orders booked with the simulated "Demo Courier", so a prospect
// sees a working store straight after logging in.

const PRODUCTS = [
  { title: "Oversized Graphic Tee", sku: "TEE-OVR-01", price: 1890, cost: 820, stock: 140 },
  { title: "Fleece Hoodie", sku: "HOOD-FLC-02", price: 3990, cost: 1950, stock: 62 },
  { title: "Cargo Joggers", sku: "JOG-CRG-03", price: 2790, cost: 1300, stock: 88 },
  { title: "Classic White Sneakers", sku: "SNK-WHT-04", price: 5490, cost: 3100, stock: 7 },
  { title: "Canvas Tote Bag", sku: "BAG-TOT-05", price: 1490, cost: 560, stock: 120 },
  { title: "Embroidered Cap", sku: "CAP-EMB-06", price: 1290, cost: 480, stock: 95 },
  { title: "Minimal Steel Watch", sku: "WCH-STL-07", price: 4990, cost: 2600, stock: 0 },
  { title: "Oud Perfume 50ml", sku: "PRF-OUD-08", price: 3490, cost: 1400, stock: 9 },
];
const WEIGHTS = [18, 10, 12, 7, 9, 10, 5, 9];
const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Gujranwala", "Sialkot", "Hyderabad"];
const CITY_W = [22, 24, 10, 8, 8, 7, 6, 5, 5, 5];
const FIRST = ["Ayesha", "Fatima", "Hira", "Sana", "Maham", "Zainab", "Areeba", "Ali", "Ahmed", "Hamza", "Usman", "Bilal", "Saad", "Hassan", "Fahad", "Noor", "Iqra", "Danish"];
const LAST = ["Khan", "Malik", "Sheikh", "Butt", "Raza", "Iqbal", "Qureshi", "Siddiqui", "Mirza", "Ansari", "Chaudhry"];
const AREAS = ["DHA Phase 5", "Gulberg III", "Model Town", "Johar Town", "Bahria Town", "Clifton Block 2", "Gulshan-e-Iqbal", "F-10 Markaz", "Satellite Town", "Cantt"];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function loadSampleData(tenantId: number) {
  const r = rng(tenantId * 7919 + 17);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const weighted = <T,>(items: T[], w: number[]) => {
    let x = r() * w.reduce((s, v) => s + v, 0);
    for (let i = 0; i < items.length; i++) if ((x -= w[i]) <= 0) return items[i];
    return items[items.length - 1];
  };

  const products = await db.product.createManyAndReturn({ data: PRODUCTS.map((p) => ({ tenantId, ...p })) });

  // Build everything in memory first, then insert in a few batches.
  type C = { name: string; phone: string; city: string; createdAt: Date };
  type L = { productId: number; title: string; sku: string; qty: number; price: number };
  type O = {
    customer: number; placedAt: Date; lines: L[]; address: string; discount: number; cod: boolean;
    status: OrderStatus; ship?: { tracking: string; bookedAt: Date; status: ShipmentStatus; courierStatus: string };
  };
  const customers: C[] = [];
  const orders: O[] = [];
  const now = Date.now();

  for (let day = 44; day >= 0; day--) {
    const perDay = Math.round(6 + (44 - day) * 0.18 + r() * 4);
    const count = day === 0 ? Math.max(3, Math.round(perDay * (new Date().getHours() / 24))) : perDay;
    for (let k = 0; k < count; k++) {
      const dayStart = new Date(now - day * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const span = day === 0 ? now - dayStart.getTime() : 86400000;
      const placedAt = new Date(dayStart.getTime() + Math.floor((0.3 + r() * 0.7) * span));

      let customer = customers.length > 25 && r() < 0.22 ? Math.floor(r() * customers.length) : -1;
      if (customer < 0) {
        customers.push({ name: `${pick(FIRST)} ${pick(LAST)}`, phone: `03${Math.floor(r() * 5)}${Math.floor(r() * 10)}${Math.floor(1000000 + r() * 8999999)}`, city: weighted(CITIES, CITY_W), createdAt: placedAt });
        customer = customers.length - 1;
      }

      const lines: L[] = [];
      const lineCount = r() < 0.75 ? 1 : 2;
      while (lines.length < lineCount) {
        const p = weighted(products, WEIGHTS);
        if (lines.some((l) => l.productId === p.id)) continue;
        lines.push({ productId: p.id, title: p.title, sku: p.sku!, qty: r() < 0.85 ? 1 : 2, price: p.price });
      }

      const ageH = (now - placedAt.getTime()) / 3600000;
      const cancelled = ageH > 8 && r() < 0.05;
      const booked = !cancelled && ageH > 10 && r() < (ageH > 30 ? 1 : 0.6);
      const o: O = {
        customer, placedAt, lines,
        address: `House ${Math.floor(1 + r() * 450)}, ${pick(AREAS)}, ${customers[customer].city}`,
        discount: r() < 0.12 ? 300 : 0,
        cod: r() < 0.82,
        status: cancelled ? "CANCELLED" : booked ? "BOOKED" : ageH < 3 || r() < 0.5 ? "NEW" : "CONFIRMED",
      };
      if (booked) {
        const bookedAt = new Date(placedAt.getTime() + (4 + r() * 6) * 3600000);
        // Demo tracking: a final digit of 7 means the parcel comes back (see couriers.ts).
        const tracking = `DM${String(Math.floor(r() * 1e9)).padStart(9, "0")}${r() < 0.11 ? 7 : Math.floor(r() * 7)}`;
        const sim = adapters.DEMO.simulate(bookedAt, tracking);
        o.ship = { tracking, bookedAt, status: sim.status, courierStatus: sim.courierStatus };
        o.status = sim.status === "DELIVERED" ? "DELIVERED" : sim.status === "RETURNED" ? "RETURNED" : sim.status === "BOOKED" ? "BOOKED" : "IN_TRANSIT";
      }
      orders.push(o);
    }
  }

  const savedCustomers = await db.customer.createManyAndReturn({ data: customers.map((c) => ({ tenantId, ...c })), select: { id: true } });
  const totals = orders.map((o) => {
    const subtotal = o.lines.reduce((s, l) => s + l.qty * l.price, 0);
    return { subtotal, total: subtotal - o.discount + 200 };
  });
  const savedOrders = await db.order.createManyAndReturn({
    data: orders.map((o, i) => {
      const c = customers[o.customer];
      return {
        tenantId,
        source: "SHOPIFY" as const,
        shopifyOrderId: `sample-${tenantId}-${1001 + i}`,
        number: `#${1001 + i}`,
        customerId: savedCustomers[o.customer].id,
        customerName: c.name,
        phone: c.phone,
        city: c.city,
        address: o.address,
        subtotal: totals[i].subtotal,
        discount: o.discount,
        shippingFee: 200,
        total: totals[i].total,
        paymentMethod: o.cod ? ("COD" as const) : ("PREPAID" as const),
        status: o.status,
        placedAt: o.placedAt,
        createdAt: o.placedAt,
      };
    }),
    select: { id: true },
  });

  await db.orderItem.createMany({ data: orders.flatMap((o, i) => o.lines.map((l) => ({ orderId: savedOrders[i].id, ...l }))) });
  await db.shipment.createMany({
    data: orders.flatMap((o, i) => {
      if (!o.ship) return [];
      const finalAt = new Date(o.ship.bookedAt.getTime() + 60 * 3600000);
      return [{
        tenantId,
        orderId: savedOrders[i].id,
        courier: "DEMO" as const,
        trackingNumber: o.ship.tracking,
        status: o.ship.status,
        courierStatus: o.ship.courierStatus,
        codAmount: o.cod ? totals[i].total : 0,
        courierCharge: 250,
        bookedAt: o.ship.bookedAt,
        lastCheckedAt: new Date(),
        deliveredAt: o.ship.status === "DELIVERED" ? finalAt : null,
        returnedAt: o.ship.status === "RETURNED" ? finalAt : null,
        codRemitted: o.ship.status === "DELIVERED" && now - finalAt.getTime() > 6 * 86400000,
      }];
    }),
  });
  await db.activity.createMany({
    data: orders.flatMap((o, i) => [
      { tenantId, orderId: savedOrders[i].id, message: "Order received from Shopify", createdAt: o.placedAt },
      ...(o.ship ? [{ tenantId, orderId: savedOrders[i].id, message: `Booked with Demo Courier — ${o.ship.tracking}`, createdAt: o.ship.bookedAt }] : []),
      ...(o.status === "CANCELLED" ? [{ tenantId, orderId: savedOrders[i].id, message: "Cancelled — customer not reachable", createdAt: new Date(o.placedAt.getTime() + 6 * 3600000) }] : []),
    ]),
  });
}
