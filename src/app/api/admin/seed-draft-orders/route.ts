import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

const orders = [
  { name: "Ahmed Raza", phone: "03001234567", city: "Lahore", items: [{ desc: "Cancon Pro 72", qty: 1, price: 998 }], total: 998 },
  { name: "Fatima Malik", phone: "03012345678", city: "Karachi", items: [{ desc: "CA Bat", qty: 2, price: 2498 }], total: 4996 },
  { name: "Usman Khan", phone: "03123456789", city: "Islamabad", items: [{ desc: "Wicket Keeper Gloves", qty: 1, price: 1448 }], total: 1448 },
  { name: "Zainab Hussain", phone: "03214567890", city: "Faisalabad", items: [{ desc: "Cricket Ball", qty: 3, price: 450 }], total: 1350 },
  { name: "Ali Raza", phone: "03335678901", city: "Rawalpindi", items: [{ desc: "Cancon Pro 72", qty: 1, price: 998 }, { desc: "CA Bat", qty: 1, price: 2498 }], total: 3496 },
  { name: "Sana Sheikh", phone: "03456789012", city: "Multan", items: [{ desc: "Batting Gloves", qty: 1, price: 1200 }], total: 1200 },
  { name: "Bilal Ahmed", phone: "03567890123", city: "Peshawar", items: [{ desc: "Cancon Pro 72", qty: 2, price: 998 }], total: 1996 },
  { name: "Ayesha Noor", phone: "03678901234", city: "Quetta", items: [{ desc: "Cricket Helmet", qty: 1, price: 2749 }], total: 2749 },
  { name: "Hamza Iqbal", phone: "03789012345", city: "Sialkot", items: [{ desc: "CA Bat", qty: 1, price: 2498 }], total: 2498 },
  { name: "Nadia Butt", phone: "03890123456", city: "Gujranwala", items: [{ desc: "Wicket Keeper Pads", qty: 1, price: 1800 }], total: 1800 },
  { name: "Tariq Mehmood", phone: "03901234567", city: "Lahore", items: [{ desc: "Cancon Pro 72", qty: 1, price: 998 }, { desc: "Cricket Ball", qty: 2, price: 450 }], total: 1898 },
  { name: "Hina Qureshi", phone: "03011234568", city: "Karachi", items: [{ desc: "CA Bat", qty: 1, price: 2498 }], total: 2498 },
  { name: "Shahid Afridi", phone: "03121234569", city: "Kohat", items: [{ desc: "Cricket Helmet", qty: 1, price: 2749 }, { desc: "Batting Gloves", qty: 1, price: 1200 }], total: 3949 },
  { name: "Rabia Saleem", phone: "03221234570", city: "Hyderabad", items: [{ desc: "Cancon Pro 72", qty: 1, price: 998 }], total: 998 },
  { name: "Imran Siddiqui", phone: "03331234571", city: "Bahawalpur", items: [{ desc: "Wicket Keeper Gloves", qty: 1, price: 1448 }, { desc: "Cricket Ball", qty: 1, price: 450 }], total: 1898 },
];

export async function POST() {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = Date.now();
  const created = [];
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const orderNum = 5360 + i;
    const order = await prisma.ecomOrder.create({
      data: {
        customerName: o.name,
        phone: o.phone,
        city: o.city,
        totalAmount: o.total,
        status: "PENDING",
        draft: true,
        shopifyOrderId: String(orderNum),
        notes: "Shopify Order #" + orderNum,
        date: new Date(now - i * 3600000 * 2),
        items: {
          create: o.items.map((it) => ({
            description: it.desc,
            quantity: it.qty,
            rate: it.price,
            packSize: 1,
          })),
        },
      },
    });
    created.push(`#${orderNum} - ${o.name}`);
  }
  return NextResponse.json({ ok: true, created });
}
