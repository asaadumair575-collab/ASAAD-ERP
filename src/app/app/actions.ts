"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Courier } from "@/generated/prisma/client";
import { requireOwner, requireUser } from "@/lib/auth";
import { adapters, COURIER_INFO } from "@/lib/couriers";
import { encrypt, hashPassword, verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { bookOrder, refreshTracking } from "@/lib/shipping";
import { clientCredentialsToken, normalizeShop, registerWebhooks, shopInfo, syncStore } from "@/lib/shopify";
import { IMPORT_COLUMNS, parseCsv } from "@/lib/csv";

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
  const open = await db.order.findMany({ where: { tenantId: user.tenantId, id: { in: ids }, status: { in: ["NEW", "CONFIRMED"] } }, select: { id: true } });
  if (!open.length) return { ok: false, message: "Nothing to book — the selected orders are already booked or closed." };
  for (const { id } of open) {
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
    update: { ...conn, method: "TOKEN", clientCreds: null, tokenExpiresAt: null, connectedAt: new Date(), lastSyncAt: null, syncError: null },
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

export async function connectShopifyWithClient(_: Result | undefined, form: FormData): Promise<Result> {
  const user = await requireOwner();
  const shop = normalizeShop(String(form.get("shop") ?? ""));
  const clientId = String(form.get("clientId") ?? "").trim();
  const clientSecret = String(form.get("clientSecret") ?? "").trim();
  if (!shop) return { ok: false, message: "Enter your store address, e.g. yourstore.myshopify.com" };
  if (!clientId || !clientSecret) return { ok: false, message: "Paste both the Client ID and the Client secret." };
  const taken = await db.shopifyConnection.findUnique({ where: { shopDomain: shop } });
  if (taken && taken.tenantId !== user.tenantId) return { ok: false, message: "This store is already connected to another account." };
  let t;
  try {
    t = await clientCredentialsToken(shop, clientId, clientSecret);
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
  const conn = { shopDomain: shop, accessToken: encrypt(t.token), clientCreds: encrypt(JSON.stringify({ clientId, clientSecret })), tokenExpiresAt: t.expiresAt, scope: t.scope };
  try {
    await shopInfo(conn);
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
  const saved = await db.shopifyConnection.upsert({
    where: { tenantId: user.tenantId },
    update: { ...conn, method: "CLIENT", connectedAt: new Date(), lastSyncAt: null, syncError: null },
    create: { tenantId: user.tenantId, ...conn, method: "CLIENT" },
  });
  await registerWebhooks(saved).catch(() => null);
  try {
    const r = await syncStore(user.tenantId);
    refresh();
    return { ok: true, message: `Connected ${shop} — imported ${r.created} orders and ${r.products} products. New orders now arrive automatically.` };
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

// ── Blocked numbers ───────────────────────────────────────────────────────

export async function blockPhone(phone: string, reason: string): Promise<Result> {
  const user = await requireUser();
  const p = phone.trim();
  if (!p) return { ok: false, message: "Enter a phone number." };
  await db.blockedPhone.upsert({
    where: { tenantId_phone: { tenantId: user.tenantId, phone: p } },
    update: { reason: reason || null },
    create: { tenantId: user.tenantId, phone: p, reason: reason || null, by: user.name },
  });
  refresh();
  return { ok: true, message: `${p} blocked — orders from this number can't be booked.` };
}

export async function unblockPhone(phone: string): Promise<Result> {
  const user = await requireUser();
  await db.blockedPhone.deleteMany({ where: { tenantId: user.tenantId, phone } });
  refresh();
  return { ok: true, message: `${phone} unblocked.` };
}

export async function blockPhoneForm(_: Result | undefined, form: FormData): Promise<Result> {
  return blockPhone(String(form.get("phone") ?? ""), String(form.get("reason") ?? "").trim());
}

// ── Expenses ──────────────────────────────────────────────────────────────

export async function addExpense(_: Result | undefined, form: FormData): Promise<Result> {
  const user = await requireUser();
  const amount = Number(form.get("amount"));
  const category = String(form.get("category") ?? "").trim() || "Other";
  const date = new Date(String(form.get("date") ?? "") || Date.now());
  if (!(amount > 0)) return { ok: false, message: "Enter an amount above zero." };
  if (Number.isNaN(date.getTime())) return { ok: false, message: "Enter a valid date." };
  await db.expense.create({ data: { tenantId: user.tenantId, amount, category, date, note: String(form.get("note") ?? "").trim() || null, by: user.name } });
  refresh();
  return { ok: true, message: `Added Rs ${Math.round(amount).toLocaleString("en-PK")} for ${category}.` };
}

export async function deleteExpense(id: number) {
  const user = await requireUser();
  await db.expense.deleteMany({ where: { id, tenantId: user.tenantId } });
  refresh();
}

// ── Store details (slips & messages) ──────────────────────────────────────

export async function updateStoreDetails(_: Result | undefined, form: FormData): Promise<Result> {
  const user = await requireOwner();
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (!get("name")) return { ok: false, message: "Store name can't be empty." };
  await db.tenant.update({ where: { id: user.tenantId }, data: { name: get("name"), phone: get("phone") || null, address: get("address") || null } });
  refresh();
  return { ok: true, message: "Store details saved." };
}

// ── CSV import ────────────────────────────────────────────────────────────

export type ImportResult = Result & { errors?: string[] };

export async function importOrders(_: ImportResult | undefined, form: FormData): Promise<ImportResult> {
  const user = await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose a CSV file first." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "File is too large (max 5 MB)." };
  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { ok: false, message: "The file has no orders — keep the header row and add one order per row." };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = IMPORT_COLUMNS.filter((c) => c.required && !header.includes(c.key)).map((c) => c.key);
  if (missing.length) return { ok: false, message: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template to see the exact headings.` };
  if (rows.length > 2001) return { ok: false, message: "Import up to 2,000 rows at a time." };

  const products = await db.product.findMany({ where: { tenantId: user.tenantId }, select: { id: true, title: true, sku: true } });
  const bySku = new Map(products.filter((p) => p.sku).map((p) => [p.sku!.toLowerCase(), p]));
  const byTitle = new Map(products.map((p) => [p.title.toLowerCase(), p]));

  type Draft = { number: string | null; name: string; phone: string; city: string; address: string; ship: number; payment: "COD" | "PREPAID"; notes: string; items: { title: string; sku: string | null; qty: number; price: number; productId: number | null }[] };
  const drafts = new Map<string, Draft>();
  const errors: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const v = (k: string) => (r[header.indexOf(k)] ?? "").trim();
    const need = ["customer_name", "phone", "city", "address", "product", "price"].filter((k) => !v(k));
    if (need.length) { errors.push(`Row ${line}: ${need.join(", ")} empty`); return; }
    const price = Number(v("price").replace(/[^\d.]/g, ""));
    const qty = v("qty") ? Number(v("qty")) : 1;
    if (!(price >= 0) || !Number.isFinite(price)) { errors.push(`Row ${line}: price "${v("price")}" is not a number`); return; }
    if (!Number.isInteger(qty) || qty < 1) { errors.push(`Row ${line}: qty "${v("qty")}" must be a whole number`); return; }
    const pay = v("payment").toUpperCase();
    if (pay && pay !== "COD" && pay !== "PREPAID") { errors.push(`Row ${line}: payment must be COD or PREPAID`); return; }
    const product = (v("sku") && bySku.get(v("sku").toLowerCase())) || byTitle.get(v("product").toLowerCase()) || null;
    const key = v("order_number") || `row-${line}`;
    const d = drafts.get(key) ?? {
      number: v("order_number") || null, name: v("customer_name"), phone: v("phone"), city: v("city"), address: v("address"),
      ship: Number(v("shipping_fee").replace(/[^\d.]/g, "")) || 0, payment: pay === "PREPAID" ? "PREPAID" : "COD", notes: v("notes"), items: [],
    };
    d.items.push({ title: product?.title ?? v("product"), sku: product?.sku ?? (v("sku") || null), qty, price, productId: product?.id ?? null });
    drafts.set(key, d);
  });

  if (!drafts.size) return { ok: false, message: "No valid rows to import.", errors: errors.slice(0, 20) };

  const existing = new Set(
    (await db.order.findMany({ where: { tenantId: user.tenantId, number: { in: [...drafts.values()].map((d) => d.number).filter((n): n is string => Boolean(n)) } }, select: { number: true } })).map((o) => o.number),
  );
  let seq = await db.order.count({ where: { tenantId: user.tenantId, number: { startsWith: "I-" } } });
  let created = 0;
  for (const d of drafts.values()) {
    if (d.number && existing.has(d.number)) { errors.push(`Order ${d.number} already exists — skipped`); continue; }
    const subtotal = d.items.reduce((s, i) => s + i.qty * i.price, 0);
    await db.order.create({
      data: {
        tenantId: user.tenantId, source: "MANUAL", number: d.number ?? `I-${1001 + seq++}`,
        customerName: d.name, phone: d.phone, city: d.city, address: d.address,
        subtotal, shippingFee: d.ship, total: subtotal + d.ship, paymentMethod: d.payment, status: "CONFIRMED",
        items: { create: d.items },
        activity: { create: [
          { tenantId: user.tenantId, by: user.name, message: `Imported from ${file.name}` },
          ...(d.notes ? [{ tenantId: user.tenantId, by: user.name, message: `Note: ${d.notes}` }] : []),
        ] },
      },
    });
    created++;
  }
  refresh();
  return {
    ok: created > 0,
    message: `${created} order${created === 1 ? "" : "s"} imported as Confirmed — ready to book.${errors.length ? ` ${errors.length} row${errors.length === 1 ? "" : "s"} skipped.` : ""}`,
    errors: errors.slice(0, 20),
  };
}
