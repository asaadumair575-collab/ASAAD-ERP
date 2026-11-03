import type { Courier, ShipmentStatus } from "@/generated/prisma/client";
import { adapters, COURIER_INFO, type Creds } from "./couriers";
import { decrypt } from "./crypto";
import { db } from "./db";
import { fulfillInShopify } from "./shopify";

export async function connectedCouriers(tenantId: number, isDemo: boolean): Promise<Courier[]> {
  const rows = await db.courierAccount.findMany({ where: { tenantId }, select: { courier: true } });
  const list = rows.map((r) => r.courier);
  if (isDemo && !list.includes("DEMO")) list.push("DEMO");
  return list;
}

async function credsFor(tenantId: number, courier: Courier): Promise<Creds> {
  if (courier === "DEMO") return {};
  const acc = await db.courierAccount.findUnique({ where: { tenantId_courier: { tenantId, courier } } });
  if (!acc) throw new Error(`${COURIER_INFO[courier].name} is not connected.`);
  return JSON.parse(decrypt(acc.credentials)) as Creds;
}

export async function bookOrder(tenantId: number, orderId: number, courier: Courier, by: string, isDemo: boolean) {
  if (courier === "DEMO" && !isDemo) throw new Error("Demo courier is only available on demo accounts.");
  const order = await db.order.findFirst({ where: { id: orderId, tenantId }, include: { items: true, shipment: true } });
  if (!order) throw new Error("Order not found");
  if (order.shipment) throw new Error(`${order.number} is already booked (${order.shipment.trackingNumber}).`);
  if (order.status !== "NEW" && order.status !== "CONFIRMED") throw new Error(`${order.number} can't be booked while ${order.status.toLowerCase()}.`);
  if (!order.phone || !order.city || !order.address) throw new Error(`${order.number} is missing phone, city or address.`);

  const creds = await credsFor(tenantId, courier);
  const cod = order.paymentMethod === "COD" ? order.total : 0;
  const pieces = order.items.reduce((s, i) => s + i.qty, 0) || 1;
  const result = await adapters[courier].book(creds, {
    orderRef: order.number.replace(/^#/, ""),
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    address: order.address,
    city: order.city,
    codAmount: cod,
    pieces,
    description: order.items.map((i) => `${i.title} x${i.qty}`).join(", ") || order.number,
    weightKg: Math.max(0.5, pieces * 0.5),
  });

  await db.$transaction([
    db.shipment.create({
      data: {
        tenantId,
        orderId,
        courier,
        trackingNumber: result.trackingNumber,
        slipUrl: result.slipUrl ?? null,
        courierCharge: result.charge ?? 0,
        codAmount: cod,
        weightKg: Math.max(0.5, pieces * 0.5),
      },
    }),
    db.order.update({ where: { id: orderId }, data: { status: "BOOKED" } }),
    db.activity.create({ data: { tenantId, orderId, by, message: `Booked with ${COURIER_INFO[courier].name} — ${result.trackingNumber}` } }),
  ]);

  // Mark fulfilled in Shopify with the tracking number (best effort).
  if (order.shopifyOrderId && courier !== "DEMO") {
    const conn = await db.shopifyConnection.findUnique({ where: { tenantId } });
    if (conn) {
      await fulfillInShopify(conn, order.shopifyOrderId, {
        number: result.trackingNumber,
        company: COURIER_INFO[courier].name,
        url: COURIER_INFO[courier].trackUrl(result.trackingNumber),
      }).catch((e) => db.activity.create({ data: { tenantId, orderId, message: `Could not update Shopify: ${e instanceof Error ? e.message : e}` } }));
    }
  }
  return result.trackingNumber;
}

const FINAL: ShipmentStatus[] = ["DELIVERED", "RETURNED", "CANCELLED"];

// Re-check tracking for open shipments. `staleMinutes` skips ones checked recently.
export async function refreshTracking(tenantId: number, opts: { ids?: number[]; staleMinutes?: number; limit?: number } = {}) {
  const staleBefore = new Date(Date.now() - (opts.staleMinutes ?? 0) * 60000);
  const shipments = await db.shipment.findMany({
    where: {
      tenantId,
      status: { notIn: FINAL },
      ...(opts.ids ? { id: { in: opts.ids } } : {}),
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: staleBefore } }],
    },
    orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
    take: opts.limit ?? 60,
  });
  const credsCache = new Map<Courier, Creds | null>();
  let updated = 0;
  let failed = 0;

  for (const s of shipments) {
    try {
      let result;
      if (s.courier === "DEMO") result = adapters.DEMO.simulate(s.bookedAt, s.trackingNumber);
      else {
        if (!credsCache.has(s.courier)) credsCache.set(s.courier, await credsFor(tenantId, s.courier).catch(() => null));
        const creds = credsCache.get(s.courier);
        if (!creds) continue;
        result = await adapters[s.courier].track(creds, s.trackingNumber);
      }
      if (!result) {
        await db.shipment.update({ where: { id: s.id }, data: { lastCheckedAt: new Date() } });
        continue;
      }
      const changed = result.status !== s.status;
      await db.shipment.update({
        where: { id: s.id },
        data: {
          status: result.status,
          courierStatus: result.courierStatus,
          lastCheckedAt: new Date(),
          ...(result.charge ? { courierCharge: result.charge } : {}),
          ...(result.status === "DELIVERED" && !s.deliveredAt ? { deliveredAt: new Date() } : {}),
          ...(result.status === "RETURNED" && !s.returnedAt ? { returnedAt: new Date() } : {}),
        },
      });
      if (changed) {
        updated++;
        const orderStatus = result.status === "DELIVERED" ? "DELIVERED" : result.status === "RETURNED" ? "RETURNED" : result.status === "CANCELLED" ? "CANCELLED" : result.status === "BOOKED" ? "BOOKED" : "IN_TRANSIT";
        await db.order.update({ where: { id: s.orderId }, data: { status: orderStatus } });
        await db.activity.create({ data: { tenantId, orderId: s.orderId, message: `Courier update: ${result.courierStatus}` } });
      }
    } catch {
      failed++;
    }
  }
  return { checked: shipments.length, updated, failed };
}
