"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Courier } from "@/generated/prisma/client";
import { requireOwner, requireUser } from "@/lib/auth";
import { adapters, COURIER_INFO } from "@/lib/couriers";
import { encrypt, hashPassword, verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { bookOrder, refreshTracking } from "@/lib/shipping";
import { normalizeShop, shopInfo, syncStore } from "@/lib/shopify";

export type Result = { ok: boolean; message: string };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function refresh() {
  revalidatePath("/app", "layout");
}

// ── Orders ────────────────────────────────────────────────────────────────

export async function confirmOrders(ids: number[]): Promise<Result> {
  const user = await requireUser();
  const orders = await db.order.findMany({ where: { tenantId: user.tenantId, id: { in: ids }, status: "NEW" }, select: { id: true } });
  await db.$transaction([
    db.order.updateMany({ where: { id: { in: orders.map((o) => o.id) } }, data: { status: "CONFIRMED" } }),
    db.activity.createMany({ data: orders.map((o) => ({ tenantId: user.tenantId, orderId: o.id, by: user.name, message: "Order confirmed" })) }),
  ]);
  refresh();
  return { ok: true, message: `${orders.length} order${orders.length === 1 ? "" : "s"} confirmed` };
}

export async function cancelOrders(ids: number[]): Promise<Result> {
  const user = await requireUser();
  const orders = await db.order.findMany({ where: { tenantId: user.tenantId, id: { in: ids }, status: { in: ["NEW", "CONFIRMED"] } }, select: { id: true } });
  await db.$transaction([
    db.order.updateMany({ where: { id: { in: orders.map((o) => o.id) } }, data: { status: "CANCELLED" } }),
    db.activity.createMany({ data: orders.map((o) => ({ tenantId: user.tenantId, orderId: o.id, by: user.name, message: "Order cancelled" })) }),
  ]);
  refresh();
  return { ok: true, message: `${orders.length} order${orders.length === 1 ? "" : "s"} cancelled` };
}

export async function bookOrders(ids: number[], courier: Courier): Promise<Result> {
  const user = await requireUser();
  let booked = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await bookOrder(user.tenantId, id, courier, user.name, user.tenant.isDemo);
      booked++;
    } catch (e) {
      errors.push(errMsg(e));
    }
  }
  refresh();
  const name = COURIER_INFO[courier].name;
  if (!errors.length) return { ok: true, message: `${booked} order${booked === 1 ? "" : "s"} booked with ${name}` };
  return { ok: booked > 0, message: `${booked} booked with ${name}. ${errors.length} failed: ${errors.slice(0, 3).join(" · ")}${errors.length > 3 ? " …" : ""}` };
}

export async function updateOrderDetails(orderId: number, form: FormData) {
  const user = await requireUser();
  const get = (k: string) => String(form.get(k) ?? "").trim() || null;
  await db.order.updateMany({
    where: { id: orderId, tenantId: user.tenantId },
    data: { customerName: get("customerName") ?? "Customer", phone: get("phone"), city: get("city"), address: get("address") },
  });
  await db.activity.create({ data: { tenantId: user.tenantId, orderId, by: user.name, message: "Customer details updated" } });
  refresh();
}

export async function addOrderNote(orderId: number, form: FormData) {
  const user = await requireUser();
  const note = String(form.get("note") ?? "").trim();
  if (!note) return;
  const order = await db.order.findFirst({ where: { id: orderId, tenantId: user.tenantId }, select: { id: true } });
  if (!order) return;
  await db.activity.create({ data: { tenantId: user.tenantId, orderId, by: user.name, message: `Note: ${note}` } });
  refresh();
}

export async function setDeliveryOutcome(orderId: number, outcome: "DELIVERED" | "RETURNED") {
  const user = await requireUser();
  const shipment = await db.shipment.findFirst({ where: { orderId, tenantId: user.tenantId } });
  if (!shipment) return;
  await db.$transaction([
    db.shipment.update({
      where: { id: shipment.id },
      data: { status: outcome, courierStatus: `Marked ${outcome.toLowerCase()} manually`, ...(outcome === "DELIVERED" ? { deliveredAt: new Date() } : { returnedAt: new Date() }) },
    }),
    db.order.update({ where: { id: orderId }, data: { status: outcome } }),
    db.activity.create({ data: { tenantId: user.tenantId, orderId, by: user.name, message: `Marked ${outcome.toLowerCase()} manually` } }),
  ]);
  refresh();
}

export async function createManualOrder(form: FormData) {
  const user = await requireUser();
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const productId = Number(form.get("productId")) || null;
  const qty = Math.max(1, Number(form.get("qty")) || 1);
  const product = productId ? await db.product.findFirst({ where: { id: productId, tenantId: user.tenantId } }) : null;
  const price = Number(form.get("price")) || product?.price || 0;
  const shippingFee = Number(form.get("shippingFee")) || 0;
  const count = await db.order.count({ where: { tenantId: user.tenantId, source: "MANUAL" } });
  const order = await db.order.create({
    data: {
      tenantId: user.tenantId,
      source: "MANUAL",
      number: `M-${1001 + count}`,
      customerName: get("customerName") || "Customer",
      phone: get("phone") || null,
      city: get("city") || null,
      address: get("address") || null,
      subtotal: price * qty,
      shippingFee,
      total: price * qty + shippingFee,
      paymentMethod: get("payment") === "PREPAID" ? "PREPAID" : "COD",
      status: "CONFIRMED",
      items: { create: [{ title: product ? product.title : get("itemTitle") || "Item", sku: product?.sku ?? null, qty, price, productId: product?.id ?? null }] },
      activity: { create: { tenantId: user.tenantId, by: user.name, message: "Order created manually" } },
    },
  });
  refresh();
  redirect(`/app/orders/${order.id}`);
}

// ── Shipments ─────────────────────────────────────────────────────────────

export async function refreshShipments(ids?: number[]): Promise<Result> {
  const user = await requireUser();
  const r = await refreshTracking(user.tenantId, { ids, limit: 100 });
  refresh();
  return { ok: true, message: `Checked ${r.checked} parcel${r.checked === 1 ? "" : "s"} — ${r.updated} updated${r.failed ? `, ${r.failed} could not be reached` : ""}` };
}

export async function setRemitted(ids: number[], remitted: boolean): Promise<Result> {
  const user = await requireUser();
  const r = await db.shipment.updateMany({
    where: { tenantId: user.tenantId, id: { in: ids }, status: "DELIVERED" },
    data: { codRemitted: remitted, remittedAt: remitted ? new Date() : null },
  });
  refresh();
  return { ok: true, message: `${r.count} parcel${r.count === 1 ? "" : "s"} marked ${remitted ? "paid" : "unpaid"}` };
}

// ── Inventory ─────────────────────────────────────────────────────────────

export async function updateProduct(productId: number, form: FormData) {
  const user = await requireUser();
  const num = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  await db.product.updateMany({
    where: { id: productId, tenantId: user.tenantId },
    data: { cost: num("cost"), stock: num("stock") ?? undefined, lowStockAt: num("lowStockAt") ?? undefined },
  });
  refresh();
}

export async function createProduct(form: FormData) {
  const user = await requireUser();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return;
  await db.product.create({
    data: {
      tenantId: user.tenantId,
      title,
      sku: String(form.get("sku") ?? "").trim() || null,
      price: Number(form.get("price")) || 0,
      cost: Number(form.get("cost")) || null,
      stock: Number(form.get("stock")) || 0,
    },
  });
  refresh();
}

// ── Shopify ───────────────────────────────────────────────────────────────

export async function syncShopifyNow(): Promise<Result> {
  const user = await requireUser();
  try {
    const r = await syncStore(user.tenantId);
    refresh();
    return { ok: true, message: `Synced — ${r.created} new order${r.created === 1 ? "" : "s"}, ${r.products} products updated` };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

export async function connectShopifyWithToken(_: Result | undefined, form: FormData): Promise<Result> {
  const user = await requireOwner();
  const shop = normalizeShop(String(form.get("shop") ?? ""));
  const token = String(form.get("token") ?? "").trim();
  if (!shop) return { ok: false, message: "Enter your store address, e.g. yourstore.myshopify.com" };
  if (!token) return { ok: false, message: "Paste the Admin API access token." };
  const taken = await db.shopifyConnection.findUnique({ where: { shopDomain: shop } });
  if (taken && taken.tenantId !== user.tenantId) return { ok: false, message: "This store is already connected to another account." };
  const conn = { shopDomain: shop, accessToken: encrypt(token) };
  try {
    await shopInfo(conn);
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
  await db.shopifyConnection.upsert({
    where: { tenantId: user.tenantId },
    update: { ...conn, method: "TOKEN", connectedAt: new Date(), lastSyncAt: null, syncError: null },
    create: { tenantId: user.tenantId, ...conn, method: "TOKEN" },
  });
  try {
    const r = await syncStore(user.tenantId);
    refresh();
    return { ok: true, message: `Connected ${shop} — imported ${r.created} orders and ${r.products} products.` };
  } catch (e) {
    refresh();
    return { ok: false, message: `Connected, but the first sync failed: ${errMsg(e)}` };
  }
}

export async function disconnectShopify() {
  const user = await requireOwner();
  await db.shopifyConnection.deleteMany({ where: { tenantId: user.tenantId } });
  refresh();
}

// ── Couriers ──────────────────────────────────────────────────────────────

export async function connectCourier(courier: Courier, _: Result | undefined, form: FormData): Promise<Result> {
  const user = await requireOwner();
  if (courier === "DEMO") return { ok: false, message: "Not available." };
  const creds: Record<string, string> = {};
  for (const f of COURIER_INFO[courier].fields) {
    const v = String(form.get(f.key) ?? "").trim();
    if (!v && !f.optional) return { ok: false, message: `${f.label} is required.` };
    if (v) creds[f.key] = v;
  }
  try {
    await adapters[courier].test(creds);
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
  await db.courierAccount.upsert({
    where: { tenantId_courier: { tenantId: user.tenantId, courier } },
    update: { credentials: encrypt(JSON.stringify(creds)) },
    create: { tenantId: user.tenantId, courier, credentials: encrypt(JSON.stringify(creds)) },
  });
  refresh();
  return { ok: true, message: `${COURIER_INFO[courier].name} connected.` };
}

export async function disconnectCourier(courier: Courier) {
  const user = await requireOwner();
  await db.courierAccount.deleteMany({ where: { tenantId: user.tenantId, courier } });
  refresh();
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function updateStoreName(form: FormData) {
  const user = await requireOwner();
  const name = String(form.get("name") ?? "").trim();
  if (name) await db.tenant.update({ where: { id: user.tenantId }, data: { name } });
  refresh();
}

export async function changePassword(_: Result | undefined, form: FormData): Promise<Result> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!verifyPassword(current, user.passwordHash)) return { ok: false, message: "Current password is wrong." };
  if (next.length < 8) return { ok: false, message: "New password must be at least 8 characters." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  return { ok: true, message: "Password changed." };
}

export async function addStaff(_: Result | undefined, form: FormData): Promise<Result> {
  const user = await requireOwner();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Enter a name and a valid email." };
  if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
  if (await db.user.findUnique({ where: { email } })) return { ok: false, message: "This email is already in use." };
  await db.user.create({ data: { tenantId: user.tenantId, name, email, passwordHash: hashPassword(password), role: "STAFF" } });
  refresh();
  return { ok: true, message: `${name} can now sign in.` };
}

export async function removeStaff(userId: number) {
  const user = await requireOwner();
  await db.user.deleteMany({ where: { id: userId, tenantId: user.tenantId, role: "STAFF" } });
  refresh();
}
