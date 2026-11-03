import { requireUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  const [orders, blocked] = await Promise.all([
    db.order.findMany({
      where: { tenantId: user.tenantId, phone: { not: null } },
      select: { phone: true, customerName: true, email: true, city: true, address: true, status: true, total: true, placedAt: true },
      orderBy: { placedAt: "desc" },
    }),
    db.blockedPhone.findMany({ where: { tenantId: user.tenantId }, select: { phone: true } }),
  ]);
  const isBlocked = new Set(blocked.map((b) => b.phone));
  const map = new Map<string, { name: string; email: string | null; city: string | null; address: string | null; orders: number; delivered: number; returned: number; spent: number; first: Date; last: Date }>();
  for (const o of orders) {
    const c = map.get(o.phone!) ?? { name: o.customerName, email: o.email, city: o.city, address: o.address, orders: 0, delivered: 0, returned: 0, spent: 0, first: o.placedAt, last: o.placedAt };
    if (o.status !== "CANCELLED") c.orders++;
    if (o.status === "DELIVERED") { c.delivered++; c.spent += o.total; }
    if (o.status === "RETURNED") c.returned++;
    c.first = o.placedAt;
    map.set(o.phone!, c);
  }
  const d = (x: Date) => x.toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" });
  const csv = toCsv(
    ["Name", "Phone", "Email", "City", "Address", "Orders", "Delivered", "Returned", "Total spent", "First order", "Last order", "Blocked"],
    [...map.entries()].map(([phone, c]) => [c.name, phone, c.email, c.city, c.address, c.orders, c.delivered, c.returned, c.spent, d(c.first), d(c.last), isBlocked.has(phone) ? "Yes" : ""]),
  );
  return csvResponse(`customers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
