import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SnapshotRow = {
  id: number;
  orderLabel: string;
  customerName: string;
  phone: string | null;
  city: string | null;
  items: string;
  trackingNumber: string | null;
  weight: number | null;
  totalAmount: number;
  returned: boolean;
};

// Creates a saved, printable-anytime snapshot of a dispatch list. Either a
// specific set of order ids, or a date whose whole day of Postex bookings
// must all be packed first — same "nothing missing" rule as the live sheet.
// Only one dispatch list may exist per calendar day, and once an order has
// gone on a list it can never appear on another — both to stop duplicate
// gate-verification sheets from causing a mistake.
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderIds, date: dateParam } = await req.json();
  const explicitIds: number[] | null = Array.isArray(orderIds) ? orderIds.map(Number).filter((n) => !Number.isNaN(n)) : null;

  const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

  let resolvedDate: string;
  let dayStart: Date;
  let dayEnd: Date;

  if (explicitIds) {
    const selected = await prisma.ecomOrder.findMany({ where: { id: { in: explicitIds } }, select: { dispatchedAt: true } });
    const days = Array.from(new Set(selected.filter((o) => o.dispatchedAt).map((o) => o.dispatchedAt!.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }))));
    if (days.length === 0) {
      return NextResponse.json({ error: "Selected orders have no dispatch date" }, { status: 400 });
    }
    if (days.length > 1) {
      return NextResponse.json({ error: "Selected orders span multiple days — generate one dispatch list per day." }, { status: 400 });
    }
    resolvedDate = days[0];
  } else {
    resolvedDate = dateParam ?? todayPK;
  }
  dayStart = new Date(`${resolvedDate}T00:00:00+05:00`);
  dayEnd = new Date(`${resolvedDate}T23:59:59+05:00`);

  // Only one dispatch list per calendar day.
  const existing = await prisma.dispatchSheet.findUnique({ where: { date: dayStart } });
  if (existing) {
    return NextResponse.json(
      { error: `A dispatch list for this date already exists (generated ${existing.createdAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}) — view it on the Dispatch page instead.`, existingId: existing.id },
      { status: 409 }
    );
  }

  const pending = await prisma.ecomOrder.findMany({
    where: { dispatchedAt: { gte: dayStart, lte: dayEnd }, packedAt: null },
    select: { id: true, customerName: true, trackingNumber: true, notes: true },
  });
  if (pending.length > 0) {
    return NextResponse.json(
      { error: `${pending.length} parcel(s) not packed yet — every order booked on Postex that day must be through Scan & Weigh first.`, pending },
      { status: 400 }
    );
  }

  const orders = await prisma.ecomOrder.findMany({
    where: explicitIds ? { id: { in: explicitIds }, packedAt: { not: null } } : { packedAt: { gte: dayStart, lte: dayEnd } },
    select: {
      id: true, customerName: true, phone: true, city: true, totalAmount: true,
      trackingNumber: true, returned: true, notes: true,
      items: { select: { description: true, quantity: true } },
    },
  });

  if (orders.length === 0) {
    return NextResponse.json({ error: "No packed parcels to include" }, { status: 400 });
  }

  // An order that's already on a previous dispatch list can never go on
  // another one.
  const alreadyUsed = await prisma.dispatchSheet.findMany({
    where: { orderIds: { hasSome: orders.map((o) => o.id) } },
    select: { id: true, date: true, orderIds: true },
  });
  if (alreadyUsed.length > 0) {
    const usedIds = new Set(alreadyUsed.flatMap((s) => s.orderIds));
    const conflicting = orders.filter((o) => usedIds.has(o.id));
    return NextResponse.json(
      {
        error: `${conflicting.length} of these order(s) are already on another dispatch list — an order can only appear on one list.`,
        conflicting: conflicting.map((o) => ({ id: o.id, customerName: o.customerName, trackingNumber: o.trackingNumber })),
      },
      { status: 409 }
    );
  }

  const trackingNumbers = orders.map((o) => o.trackingNumber).filter((t): t is string => !!t);
  const verifications = trackingNumbers.length
    ? await prisma.weightVerification.findMany({
        where: { trackingNumber: { in: trackingNumbers } },
        orderBy: { createdAt: "asc" },
        select: { trackingNumber: true, weight: true },
      })
    : [];
  const weightByTracking = new Map<string, number>();
  for (const v of verifications) weightByTracking.set(v.trackingNumber, v.weight);

  const snapshot: SnapshotRow[] = orders.map((o) => ({
    id: o.id,
    orderLabel: o.notes?.replace("Shopify Order ", "") ?? `#${o.id}`,
    customerName: o.customerName,
    phone: o.phone,
    city: o.city,
    items: o.items.length ? o.items.map((i) => `${i.description} x${i.quantity}`).join(", ") : "—",
    trackingNumber: o.trackingNumber,
    weight: o.trackingNumber ? weightByTracking.get(o.trackingNumber) ?? null : null,
    totalAmount: o.totalAmount,
    returned: o.returned,
  }));

  const totalParcels = snapshot.length;
  const totalValue = snapshot.reduce((s, o) => s + o.totalAmount, 0);
  const totalWeight = snapshot.reduce((s, o) => s + (o.weight ?? 0), 0);

  let sheet;
  try {
    sheet = await prisma.dispatchSheet.create({
      data: {
        date: dayStart,
        orderIds: orders.map((o) => o.id),
        totalParcels,
        totalValue,
        totalWeight,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        snapshot: snapshot as any,
        createdById: me.id,
      },
    });
  } catch {
    // Unique constraint race — someone else generated one for this date
    // between our check above and this insert.
    return NextResponse.json({ error: "A dispatch list for this date was just generated — view it on the Dispatch page instead." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, id: sheet.id });
}
