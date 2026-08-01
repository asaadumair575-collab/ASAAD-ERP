"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import * as XLSX from "xlsx";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  getSessionUsername,
  getSessionUser,
} from "@/lib/auth";

async function requireAuth() {
  const me = await getSessionUser();
  if (!me) throw new Error("Not authenticated");
  return me;
}

async function requireAdmin() {
  const me = await requireAuth();
  if (!me.isAdmin) throw new Error("Admin access required");
  return me;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 60 * 1000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function loginRateLimit(username: string): string | null {
  const entry = loginAttempts.get(username);
  const now = Date.now();
  if (entry && now - entry.firstAttempt < LOGIN_LOCKOUT_MS) {
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      return "Too many attempts. Try again in a minute.";
    }
    entry.count += 1;
  } else {
    loginAttempts.set(username, { count: 1, firstAttempt: now });
  }
  return null;
}

function clearLoginAttempts(username: string) {
  loginAttempts.delete(username);
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10) || null;
}

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !city) {
    throw new Error("Name and city are required");
  }

  const normalizedPhone = normalizePhone(phone);
  const existingClients = await prisma.client.findMany({
    select: { id: true, name: true, phone: true, city: true },
  });
  const duplicate = existingClients.find((c) => {
    if (normalizedPhone && normalizePhone(c.phone) === normalizedPhone) return true;
    return (
      c.name.trim().toLowerCase() === name.toLowerCase() &&
      (!normalizedPhone ? c.city.trim().toLowerCase() === city.toLowerCase() : true)
    );
  });

  if (duplicate) {
    redirect(
      `/clients/new?error=${encodeURIComponent(
        `Duplicate client: "${duplicate.name}" already exists with this name/number.`
      )}`
    );
  }

  const client = await prisma.client.create({
    data: { name, businessName, city, phone, address, notes },
  });

  revalidatePath("/clients");
  revalidatePath("/sales/invoices/new");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !city) {
    throw new Error("Name and city are required");
  }

  await prisma.client.update({
    where: { id },
    data: { name, businessName, city, phone, address, notes },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/sales/invoices/new");
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: number) {
  await requireAdmin();
  await prisma.sample.deleteMany({ where: { clientId: id } });
  await prisma.order.deleteMany({ where: { clientId: id } });
  await prisma.client.delete({ where: { id } });
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  revalidatePath("/samples");
  revalidatePath("/sales/invoices/new");
  redirect("/clients");
}

export async function createOrder(clientId: number, formData: FormData) {
  const purchaseAmount = parseFloat(String(formData.get("purchaseAmount") ?? "0"));
  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(dateRaw) : new Date();

  if (Number.isNaN(purchaseAmount)) {
    throw new Error("Purchase amount must be a number");
  }

  const descriptions = formData.getAll("itemDescription").map((v) => String(v).trim());
  const quantities = formData.getAll("itemQuantity").map((v) => parseFloat(String(v)));
  const rates = formData.getAll("itemRate").map((v) => parseFloat(String(v)));

  const items = descriptions
    .map((description, i) => ({
      description,
      quantity: quantities[i],
      rate: rates[i],
    }))
    .filter(
      (item) =>
        item.description &&
        !Number.isNaN(item.quantity) &&
        !Number.isNaN(item.rate)
    );

  if (items.length === 0) {
    throw new Error("At least one valid item is required");
  }

  const saleAmount = round2(items.reduce((s, i) => s + i.quantity * i.rate, 0));

  const orderType = String(formData.get("orderType") ?? "CREDIT");
  const deliveryChargeRaw = formData.get("deliveryCharge");
  const deliveryCharge =
    orderType === "COD" && deliveryChargeRaw
      ? parseFloat(String(deliveryChargeRaw)) || null
      : null;

  const order = await prisma.order.create({
    data: {
      clientId,
      purchaseAmount,
      saleAmount,
      date,
      orderType,
      deliveryCharge,
      confirmed: false,
      items: { create: items },
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/");
  redirect(`/clients/${clientId}/orders/${order.id}`);
}

export async function deleteOrderItem(
  itemId: number,
  orderId: number,
  clientId: number
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error("Order not found");
  }

  await prisma.orderItem.delete({ where: { id: itemId } });

  const remainingItems = await prisma.orderItem.findMany({
    where: { orderId },
  });
  const subtotal = round2(
    remainingItems.reduce((s, i) => s + i.quantity * i.rate, 0)
  );
  const taxAmount = round2((subtotal - order.discount) * (order.taxPercent / 100));
  const saleAmount = round2(subtotal - order.discount + taxAmount);
  await prisma.order.update({
    where: { id: orderId },
    data: { saleAmount },
  });

  revalidatePath(`/clients/${clientId}/orders/${orderId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/sales/invoices/paid");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function updateOrderItem(
  itemId: number,
  orderId: number,
  clientId: number,
  formData: FormData
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error("Order not found");
  }

  const description = String(formData.get("description") ?? "").trim();
  const quantity = parseFloat(String(formData.get("quantity") ?? ""));
  const rate = parseFloat(String(formData.get("rate") ?? ""));

  if (!description || Number.isNaN(quantity) || Number.isNaN(rate)) {
    throw new Error("Please provide a valid description, quantity and rate");
  }

  await prisma.orderItem.update({
    where: { id: itemId },
    data: { description, quantity, rate },
  });

  const remainingItems = await prisma.orderItem.findMany({
    where: { orderId },
  });
  const subtotal = round2(
    remainingItems.reduce((s, i) => s + i.quantity * i.rate, 0)
  );
  const taxAmount = round2((subtotal - order.discount) * (order.taxPercent / 100));
  const saleAmount = round2(subtotal - order.discount + taxAmount);
  await prisma.order.update({
    where: { id: orderId },
    data: { saleAmount },
  });

  revalidatePath(`/clients/${clientId}/orders/${orderId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/sales/invoices/paid");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function deleteOrder(orderId: number, clientId: number) {
  await requireAdmin();
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/");
}

export async function confirmOrder(
  orderId: number,
  clientId: number,
  formData: FormData
) {
  const mode = String(formData.get("mode") ?? "credit");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) {
    throw new Error("Order not found");
  }

  if (mode === "paid") {
    const amount = parseFloat(String(formData.get("amount") ?? "0"));
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error("Enter a valid payment amount");
    }

    const alreadyPaid = order.payments.reduce((s, p) => s + p.amount, 0);
    const balanceDue = order.saleAmount - alreadyPaid;
    if (amount > balanceDue + 0.01) {
      throw new Error("Payment exceeds the remaining balance due");
    }

    const paymentMethod = String(formData.get("paymentMethod") ?? "BANK_TRANSFER");

    const screenshotFile = formData.get("screenshot");
    let screenshot: string | null = null;
    if (screenshotFile instanceof File && screenshotFile.size > 0) {
      const buffer = Buffer.from(await screenshotFile.arrayBuffer());
      screenshot = `data:${screenshotFile.type};base64,${buffer.toString("base64")}`;
    } else if (paymentMethod !== "CASH") {
      throw new Error("Payment screenshot is required for bank transfer payments");
    }

    const newPaid = alreadyPaid + amount;
    const paymentStatus =
      newPaid >= order.saleAmount - 0.01
        ? "PAID"
        : newPaid > 0
          ? "PARTIAL"
          : "UNPAID";

    await prisma.payment.create({
      data: { orderId, amount, method: paymentMethod, screenshot },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { confirmed: true, paymentStatus },
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: { confirmed: true },
    });
  }

  revalidatePath(`/clients/${clientId}/orders/${orderId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/dispatch");
  revalidatePath("/");
}

export async function setDispatched(orderId: number, dispatched: boolean) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      dispatched,
      dispatchedAt: dispatched ? new Date() : null,
    },
  });

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/dispatched");
}

export async function cancelOrder(orderId: number, clientId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (order && order.payments.length > 0) {
    throw new Error("Cannot cancel an order that has received payments");
  }

  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/");
  redirect(`/clients/${clientId}`);
}

export async function createInvoice(formData: FormData) {
  const clientId = parseInt(String(formData.get("clientId") ?? ""), 10);
  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(dateRaw) : new Date();

  if (Number.isNaN(clientId)) {
    throw new Error("Please select a customer");
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new Error("Selected customer no longer exists");
  }

  const productIds = formData.getAll("itemProductId").map((v) => String(v));
  const descriptions = formData.getAll("itemDescription").map((v) => String(v).trim());
  const quantities = formData.getAll("itemQuantity").map((v) => parseFloat(String(v)));
  const rates = formData.getAll("itemRate").map((v) => parseFloat(String(v)));

  const requestedProductIds = [
    ...new Set(
      productIds
        .filter((v) => v)
        .map((v) => parseInt(v, 10))
        .filter((id) => !Number.isNaN(id))
    ),
  ];
  const existingProducts = requestedProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: requestedProductIds } },
        select: { id: true },
      })
    : [];
  const existingProductIds = new Set(existingProducts.map((p) => p.id));

  const items = descriptions
    .map((description, i) => {
      const parsedProductId = productIds[i] ? parseInt(productIds[i], 10) : null;
      const productId =
        parsedProductId !== null && existingProductIds.has(parsedProductId)
          ? parsedProductId
          : null;
      return {
        productId,
        description,
        quantity: quantities[i],
        rate: rates[i],
      };
    })
    .filter(
      (item) =>
        item.description &&
        !Number.isNaN(item.quantity) &&
        !Number.isNaN(item.rate)
    );

  if (items.length === 0) {
    throw new Error("At least one valid item is required");
  }

  const subtotal = round2(items.reduce((s, i) => s + i.quantity * i.rate, 0));

  const discount = parseFloat(String(formData.get("discount") ?? "0")) || 0;
  const taxPercent = parseFloat(String(formData.get("taxPercent") ?? "0")) || 0;
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const terms = String(formData.get("terms") ?? "").trim() || null;

  const taxAmount = round2((subtotal - discount) * (taxPercent / 100));
  const saleAmount = round2(subtotal - discount + taxAmount);

  const orderType = String(formData.get("orderType") ?? "CREDIT");
  const deliveryChargeRaw = formData.get("deliveryCharge");
  const deliveryCharge =
    orderType === "COD" && deliveryChargeRaw
      ? parseFloat(String(deliveryChargeRaw)) || null
      : null;

  const order = await prisma.order.create({
    data: {
      clientId,
      purchaseAmount: 0,
      saleAmount,
      discount,
      taxPercent,
      paymentTerms,
      notes,
      terms,
      date,
      orderType,
      deliveryCharge,
      confirmed: false,
      items: {
        create: items,
      },
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/");
  redirect(`/clients/${clientId}/orders/${order.id}`);
}

export async function recordPayment(
  orderId: number,
  clientId: number,
  formData: FormData
) {
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("Enter a valid payment amount");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  if (!order.confirmed) {
    throw new Error("Confirm the order before recording payments");
  }

  const alreadyPaid = order.payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = order.saleAmount - alreadyPaid;
  if (amount > balanceDue + 0.01) {
    throw new Error("Payment exceeds the remaining balance due");
  }

  const paymentMethod = String(formData.get("paymentMethod") ?? "BANK_TRANSFER");
  const note = String(formData.get("note") ?? "").trim() || null;

  const screenshotFile = formData.get("screenshot");
  let screenshot: string | null = null;
  if (screenshotFile instanceof File && screenshotFile.size > 0) {
    const buffer = Buffer.from(await screenshotFile.arrayBuffer());
    screenshot = `data:${screenshotFile.type};base64,${buffer.toString("base64")}`;
  } else if (paymentMethod !== "CASH") {
    throw new Error("Payment screenshot is required for bank transfer payments");
  }

  const newPaid = alreadyPaid + amount;
  const paymentStatus =
    newPaid >= order.saleAmount - 0.01
      ? "PAID"
      : newPaid > 0
        ? "PARTIAL"
        : "UNPAID";

  await prisma.payment.create({
    data: { orderId, amount, method: paymentMethod, note, screenshot },
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus },
  });

  revalidatePath(`/clients/${clientId}/orders/${orderId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/sales/invoices");
  revalidatePath("/");
}

export async function deletePayment(paymentId: number, orderId: number, clientId: number) {
  "use server";
  await requireAdmin();
  await prisma.payment.delete({ where: { id: paymentId } });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (order) {
    const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0);
    const paymentStatus =
      totalPaid >= order.saleAmount - 0.01
        ? "PAID"
        : totalPaid > 0
          ? "PARTIAL"
          : "UNPAID";
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus } });
  }

  revalidatePath(`/clients/${clientId}/orders/${orderId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/sales/invoices");
  revalidatePath("/sales/invoices/advance");
  revalidatePath("/sales/invoices/paid");
  revalidatePath("/");
}

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const costRaw = formData.get("cost");
  const cost = costRaw ? parseFloat(String(costRaw)) : null;

  if (!name) throw new Error("Product name is required");

  await prisma.product.create({ data: { name, cost: cost && !isNaN(cost) ? cost : null } });
  revalidatePath("/sales/products");
  revalidatePath("/sales/invoices/new");
  revalidatePath("/finance");
  redirect("/sales/products");
}

export async function updateProductCost(id: number, formData: FormData) {
  const costRaw = formData.get("cost");
  const cost = costRaw ? parseFloat(String(costRaw)) : null;
  await prisma.product.update({
    where: { id },
    data: { cost: cost && !isNaN(cost) ? cost : null },
  });
  revalidatePath("/sales/products");
  revalidatePath("/finance");
}

export async function deleteProduct(id: number) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/sales/products");
  revalidatePath("/sales/invoices/new");
}

export async function saveBusinessProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name) {
    throw new Error("Business name is required");
  }

  const existing = await prisma.businessProfile.findFirst();

  const logoFile = formData.get("logo");
  let logo: string | null | undefined = undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    logo = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
  }

  if (existing) {
    await prisma.businessProfile.update({
      where: { id: existing.id },
      data: { name, phone, address, ...(logo !== undefined ? { logo } : {}) },
    });
  } else {
    await prisma.businessProfile.create({
      data: { name, phone, address, logo: logo ?? null },
    });
  }

  revalidateTag("business-profile", "max");
  revalidatePath("/settings");
}

export async function setCostPerDozen(formData: FormData) {
  const costPerDozen = parseFloat(String(formData.get("costPerDozen") ?? ""));
  if (Number.isNaN(costPerDozen) || costPerDozen < 0) {
    throw new Error("Enter a valid cost per dozen");
  }

  await prisma.costRate.create({ data: { costPerDozen } });

  revalidatePath("/finance");
}

export async function setCommissionRate(formData: FormData) {
  const ratePerDozen = parseFloat(String(formData.get("ratePerDozen") ?? ""));
  if (Number.isNaN(ratePerDozen) || ratePerDozen < 0) {
    throw new Error("Enter a valid commission rate");
  }

  await prisma.commissionRate.create({ data: { ratePerDozen } });

  revalidatePath("/commission");
}

export async function createCommissionOrder(formData: FormData) {
  const orderFor = String(formData.get("orderFor") ?? "").trim();
  if (!orderFor) {
    throw new Error("Enter who the order is for");
  }

  const dozens = parseFloat(String(formData.get("dozens") ?? ""));
  if (Number.isNaN(dozens) || dozens <= 0) {
    throw new Error("Enter a valid number of dozens");
  }

  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(dateRaw) : new Date();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.commissionOrder.create({ data: { orderFor, dozens, date, notes } });

  revalidatePath("/commission");
}

export async function deleteCommissionOrder(id: number) {
  await prisma.commissionOrder.delete({ where: { id } });
  revalidatePath("/commission");
}

export async function setCommissionDispatched(id: number, dispatched: boolean) {
  await prisma.commissionOrder.update({
    where: { id },
    data: {
      dispatched,
      dispatchedAt: dispatched ? new Date() : null,
    },
  });

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/dispatched");
}

export async function createSample(formData: FormData) {
  const clientIdRaw = String(formData.get("clientId") ?? "");
  const leadIdRaw = String(formData.get("leadId") ?? "");
  const clientId = clientIdRaw ? parseInt(clientIdRaw, 10) : null;
  const leadId = leadIdRaw ? parseInt(leadIdRaw, 10) : null;
  const description = String(formData.get("description") ?? "").trim();
  const dateRaw = String(formData.get("dateSent") ?? "");
  const dateSent = dateRaw ? new Date(dateRaw) : new Date();

  if ((!clientId || Number.isNaN(clientId)) && (!leadId || Number.isNaN(leadId))) {
    throw new Error("Please select a customer or lead");
  }
  if (!description) {
    throw new Error("Sample description is required");
  }

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new Error("Selected customer no longer exists");
    }
  } else if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new Error("Selected lead no longer exists");
    }
  }

  await prisma.sample.create({
    data: { clientId, leadId, description, dateSent },
  });

  if (leadId) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "SAMPLE_SENT" },
    });
    revalidatePath("/leads/contacted");
    revalidatePath("/leads/sample-sent");
    revalidatePath(`/leads/${leadId}`);
  }

  revalidatePath("/samples");
  redirect("/samples");
}

export async function createLeadSample(formData: FormData) {
  "use server";
  const leadIdRaw = String(formData.get("leadId") ?? "").trim();
  const leadId = leadIdRaw ? parseInt(leadIdRaw, 10) : null;
  const description = String(formData.get("description") ?? "").trim();
  const dateRaw = String(formData.get("dateSent") ?? "");
  const dateSent = dateRaw ? new Date(dateRaw) : new Date();

  if (!leadId || Number.isNaN(leadId)) throw new Error("Select a lead");
  if (!description) throw new Error("Description is required");

  await prisma.sample.create({ data: { leadId, description, dateSent } });
  await prisma.lead.update({ where: { id: leadId }, data: { status: "SAMPLE_SENT" } });

  revalidatePath("/leads/sample-sent");
  revalidatePath("/leads/contacted");
  revalidatePath("/samples");
  redirect("/leads/sample-sent");
}

export async function recordSampleResponse(id: number, formData: FormData) {
  const status = String(formData.get("status") ?? "PENDING");
  const response = String(formData.get("response") ?? "").trim() || null;

  const validStatuses = ["PENDING", "ACCEPTED", "REJECTED", "NO_RESPONSE"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  await prisma.sample.update({
    where: { id },
    data: {
      status,
      response,
      responseDate: status === "PENDING" ? null : new Date(),
    },
  });

  revalidatePath("/samples");
  revalidatePath(`/samples/${id}`);
}

export async function deleteSample(id: number) {
  await prisma.sample.delete({ where: { id } });
  revalidatePath("/samples");
  redirect("/samples");
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const rateLimitError = loginRateLimit(username);
  if (rateLimitError) {
    redirect(`/login?error=${encodeURIComponent(rateLimitError)}`);
  }

  // Check DB users first
  const dbUser = await prisma.user.findUnique({ where: { username } });
  if (dbUser) {
    if (!verifyPassword(password, dbUser.passwordHash)) {
      redirect(`/login?error=${encodeURIComponent("Invalid username or password")}`);
    }
    clearLoginAttempts(username);
    await setSessionCookie(username);
    redirect("/");
  }

  // Fallback: env-based admin credentials
  const appUsername = (process.env.APP_USERNAME ?? "").trim().toLowerCase();
  const appPassword = (process.env.APP_PASSWORD ?? "").trim();

  if (appUsername && appPassword && username === appUsername && password.trim() === appPassword) {
    clearLoginAttempts(username);
    await setSessionCookie(username);
    redirect("/");
  }

  redirect(`/login?error=${encodeURIComponent("Invalid username or password")}`);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const isAdmin = formData.get("isAdmin") === "1";

  if (!username || !password) throw new Error("Username and password are required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("That username is already taken");

  const { MODULES, SUB_MODULES } = await import("@/lib/permissions");
  const permissions: Record<string, unknown> = {};
  for (const m of MODULES) {
    const val = String(formData.get(`perm_${m.key}`) ?? "none");
    permissions[m.key] = ["none", "view", "full"].includes(val) ? val : "none";
  }
  const sub: Record<string, boolean> = {};
  for (const s of SUB_MODULES) {
    if (formData.get(`sub_${s.key}`) === "1") sub[s.key] = true;
  }
  if (Object.keys(sub).length > 0) permissions.sub = sub;

  await prisma.user.create({
    data: { username, passwordHash: hashPassword(password), displayName, isAdmin, permissions: permissions as never },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function updateUser(id: number, formData: FormData) {
  await requireAdmin();
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const isAdmin = formData.get("isAdmin") === "1";

  const { MODULES, SUB_MODULES } = await import("@/lib/permissions");
  const permissions: Record<string, unknown> = {};
  for (const m of MODULES) {
    const val = String(formData.get(`perm_${m.key}`) ?? "none");
    permissions[m.key] = ["none", "view", "full"].includes(val) ? val : "none";
  }
  const sub: Record<string, boolean> = {};
  for (const s of SUB_MODULES) {
    if (formData.get(`sub_${s.key}`) === "1") sub[s.key] = true;
  }
  if (Object.keys(sub).length > 0) permissions.sub = sub;

  await prisma.user.update({
    where: { id },
    data: { displayName, isAdmin, permissions: permissions as never },
  });

  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${id}`);
}

export async function changeUserPassword(id: number, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  await prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(password) } });
  revalidatePath(`/settings/users/${id}`);
}

export async function deleteUser(id: number) {
  await requireAdmin();
  const count = await prisma.user.count();
  if (count <= 1) throw new Error("Cannot delete the last remaining user");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function resetAllData(formData: FormData) {
  await requireAdmin();
  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "DELETE") {
    throw new Error('Type "DELETE" to confirm');
  }

  const password = String(formData.get("password") ?? "");
  const username = await getSessionUsername();
  const user = username
    ? await prisma.user.findUnique({ where: { username } })
    : null;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Incorrect password");
  }

  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.costRate.deleteMany();

  revalidatePath("/", "layout");
  redirect("/settings");
}

const LEAD_STATUSES = ["NEW", "CONTACTED", "SAMPLE_SENT", "CANCELLED", "CONFIRMED"];

function isDuplicateLead(
  existing: { shopNumber: string; name: string | null; phone: string | null }[],
  shopNumber: string,
  name: string | null,
  phone: string | null
): boolean {
  const normalizedPhone = normalizePhone(phone);
  return existing.some((l) => {
    if (normalizedPhone && normalizePhone(l.phone) === normalizedPhone) return true;
    return (
      l.shopNumber.trim().toLowerCase() === shopNumber.trim().toLowerCase() &&
      (l.name ?? "").trim().toLowerCase() === (name ?? "").trim().toLowerCase()
    );
  });
}

export async function createLead(formData: FormData) {
  const shopNumber = String(formData.get("shopNumber") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!shopNumber || !phone || !city) {
    throw new Error("Shop number, contact number and city are required");
  }

  const existingLeads = await prisma.lead.findMany({
    select: { shopNumber: true, name: true, phone: true },
  });
  if (isDuplicateLead(existingLeads, shopNumber, name, phone)) {
    redirect(
      `/leads/new?error=${encodeURIComponent(
        `Duplicate shop: "${shopNumber}" already exists with this name/number.`
      )}`
    );
  }

  await prisma.lead.create({
    data: { shopNumber, name, city, phone, notes },
  });

  revalidatePath("/leads/not-contacted");
  redirect("/leads/not-contacted");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

async function parseLeadsFile(file: File): Promise<string[][]> {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return rows
      .map((row) => row.map((cell) => String(cell ?? "").trim()))
      .filter((row) => row.some((cell) => cell.length > 0));
  }

  return parseCsv(await file.text());
}

export async function uploadLeads(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/leads/new?error=${encodeURIComponent("Please choose a file to upload")}`);
  }

  const rows = await parseLeadsFile(file as File);
  if (rows.length === 0) {
    redirect(`/leads/new?error=${encodeURIComponent("File is empty")}`);
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const shopIdx = header.findIndex((h) => h.includes("shop"));
  const phoneIdx = header.findIndex(
    (h, i) =>
      i !== shopIdx &&
      (h.includes("phone") || h.includes("contact") || h.includes("number"))
  );
  const cityIdx = header.findIndex((h) => h.includes("city"));
  let nameIdx = header.findIndex((h) => h.includes("person"));
  if (nameIdx === -1) {
    nameIdx = header.findIndex(
      (h, i) => i !== shopIdx && i !== phoneIdx && h.includes("name")
    );
  }

  if (shopIdx === -1 || phoneIdx === -1 || cityIdx === -1) {
    redirect(
      `/leads/new?error=${encodeURIComponent(
        "File must have columns for Shop Name, Number (Contact) and City"
      )}`
    );
  }

  const dataRows = rows.slice(1);
  let added = 0;
  let skipped = 0;

  const existingLeads = await prisma.lead.findMany({
    select: { shopNumber: true, name: true, phone: true },
  });

  for (const row of dataRows) {
    const shopNumber = row[shopIdx]?.trim();
    const city = row[cityIdx]?.trim() || "-";
    const phone = row[phoneIdx]?.trim();
    const name = (nameIdx !== -1 ? row[nameIdx]?.trim() : "") || "-";

    if (!shopNumber || !phone) {
      skipped++;
      continue;
    }

    if (isDuplicateLead(existingLeads, shopNumber, name, phone)) {
      skipped++;
      continue;
    }

    await prisma.lead.create({ data: { shopNumber, name, city, phone } });
    existingLeads.push({ shopNumber, name, phone });
    added++;
  }

  revalidatePath("/leads/not-contacted");
  redirect(`/leads/not-contacted?added=${added}&skipped=${skipped}`);
}

export async function setLeadStatus(id: number, status: string) {
  if (!LEAD_STATUSES.includes(status)) {
    throw new Error("Invalid status");
  }

  await prisma.lead.update({ where: { id }, data: { status } });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function markLeadContacted(id: number, reason?: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  const existing = lead?.notes?.trim();
  const notes = reason
    ? existing
      ? `${existing}\nContacted: ${reason}`
      : `Contacted: ${reason}`
    : existing ?? null;

  await prisma.lead.update({
    where: { id },
    data: { status: "CONTACTED", notes },
  });

  revalidatePath("/leads");
  revalidatePath("/leads/not-contacted");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads/contacted");
}

export async function cancelLead(id: number) {
  await prisma.lead.update({ where: { id }, data: { status: "CANCELLED" } });

  revalidatePath("/leads/contacted");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads/cancelled");
  redirect("/leads/cancelled");
}

export async function cancelLeadFromSample(id: number, formData: FormData) {
  const reason = (formData.get("reason") as string | null)?.trim();

  const lead = await prisma.lead.findUnique({ where: { id } });
  const notes = [lead?.notes, reason ? `Cancelled: ${reason}` : null]
    .filter(Boolean)
    .join("\n");

  await prisma.lead.update({
    where: { id },
    data: { status: "CANCELLED", notes: notes || null },
  });

  revalidatePath("/samples");
  revalidatePath("/leads/contacted");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads/cancelled");
}

export async function bulkUpdateLeadStatus(ids: number[], status: string) {
  if (!ids.length) return;
  await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status } });
  revalidatePath("/leads");
  revalidatePath("/leads/not-contacted");
  revalidatePath("/leads/contacted");
  revalidatePath("/leads/sample-sent");
  revalidatePath("/leads/cancelled");
}

export async function deleteLead(id: number) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads/not-contacted");
  revalidatePath("/leads/contacted");
  revalidatePath("/leads/sample-sent");
  revalidatePath("/leads/cancelled");
  redirect("/leads/not-contacted");
}

export async function convertLeadToClient(id: number, formData: FormData) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    throw new Error("Lead no longer exists");
  }

  const enteredName = (formData.get("name") as string | null)?.trim();

  const client = await prisma.client.create({
    data: {
      name: enteredName || lead.name || lead.shopNumber,
      businessName: lead.shopNumber,
      city: lead.city,
      phone: lead.phone,
      notes: lead.notes,
    },
  });

  await prisma.sample.updateMany({
    where: { leadId: lead.id },
    data: { clientId: client.id, leadId: null },
  });

  await prisma.lead.delete({ where: { id } });

  revalidatePath("/leads/sample-sent");
  revalidatePath("/leads/contacted");
  revalidatePath("/leads/not-contacted");
  revalidatePath("/clients");
  revalidatePath("/samples");
  redirect(`/clients/${client.id}`);
}

export async function updateSampleResponse(sampleId: number, formData: FormData) {
  "use server";
  const response = String(formData.get("response") ?? "").trim() || null;
  await prisma.sample.update({
    where: { id: sampleId },
    data: { response, responseDate: response ? new Date() : null },
  });
  revalidatePath("/leads/sample-sent");
}

// ── Retail / COD ──────────────────────────────────────────────────────────────

export async function createRetailOrder(formData: FormData) {
  const me = await requireAuth();
  const retailCustomerIdRaw = formData.get("retailCustomerId");
  const retailCustomerId = retailCustomerIdRaw ? parseInt(String(retailCustomerIdRaw), 10) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const deliveryCharge = parseFloat(String(formData.get("deliveryCharge") ?? "0")) || 0;

  let customerName = String(formData.get("customerName") ?? "").trim();
  let phone: string | null = String(formData.get("phone") ?? "").trim() || null;
  let city: string | null = String(formData.get("city") ?? "").trim() || null;

  if (retailCustomerId) {
    const rc = await prisma.retailCustomer.findUnique({ where: { id: retailCustomerId } });
    if (rc) { customerName = rc.name; phone = phone ?? rc.phone; city = city ?? rc.city; }
  }

  if (!customerName) throw new Error("Customer name is required");

  const descriptions = formData.getAll("itemDescription").map((v) => String(v).trim());
  const quantities = formData.getAll("itemQuantity").map((v) => parseFloat(String(v)));
  const rates = formData.getAll("itemRate").map((v) => parseFloat(String(v)));
  const costPrices = formData.getAll("itemCostPrice").map((v) => parseFloat(String(v)) || 0);

  const items = descriptions
    .map((description, i) => ({ description, quantity: quantities[i], rate: rates[i], costPrice: costPrices[i] ?? 0 }))
    .filter((it) => it.description && !isNaN(it.quantity) && !isNaN(it.rate));

  if (items.length === 0) throw new Error("At least one item is required");

  const totalAmount = round2(items.reduce((s, i) => s + i.quantity * i.rate, 0));

  let advanceScreenshot: string | null = null;
  const advScreenshotFile = formData.get("advanceScreenshot");
  if (advScreenshotFile instanceof File && advScreenshotFile.size > 0) {
    const buffer = Buffer.from(await advScreenshotFile.arrayBuffer());
    advanceScreenshot = `data:${advScreenshotFile.type};base64,${buffer.toString("base64")}`;
  } else if (deliveryCharge > 0) {
    throw new Error("Advance screenshot is required");
  }

  const order = await prisma.retailOrder.create({
    data: {
      customerName, phone, city, notes, deliveryCharge, totalAmount,
      createdByUserId: me.id,
      retailCustomerId: retailCustomerId ?? undefined,
      status: deliveryCharge > 0 ? "PARTIAL" : "PENDING",
      items: { create: items },
      payments: deliveryCharge > 0
        ? { create: [{ amount: deliveryCharge, note: "Delivery Advance", screenshot: advanceScreenshot }] }
        : undefined,
    },
  });

  revalidatePath("/retail/orders");
  redirect(`/retail/${order.id}?receipt=1`);
}

export async function recordRetailPayment(orderId: number, formData: FormData) {
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const note = String(formData.get("note") ?? "").trim() || null;
  if (isNaN(amount) || amount <= 0) throw new Error("Enter a valid amount");

  const screenshotFile = formData.get("screenshot");
  let screenshot: string | null = null;
  if (screenshotFile instanceof File && screenshotFile.size > 0) {
    const buffer = Buffer.from(await screenshotFile.arrayBuffer());
    screenshot = `data:${screenshotFile.type};base64,${buffer.toString("base64")}`;
  }

  const order = await prisma.retailOrder.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new Error("Order not found");

  await prisma.retailPayment.create({ data: { orderId, amount, note, screenshot } });

  const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0) + amount;
  const status = totalPaid >= order.totalAmount - 0.01 ? "PAID" : "PARTIAL";
  await prisma.retailOrder.update({ where: { id: orderId }, data: { status } });

  revalidatePath(`/retail/orders/${orderId}`);
  revalidatePath(`/retail/${orderId}`);
  revalidatePath("/retail/orders");

  redirect(`/retail/orders/${orderId}?receipt=1`);
}

export async function updateRetailItemCostPrice(orderId: number, itemId: number, formData: FormData) {
  "use server";
  const costPrice = parseFloat(String(formData.get("costPrice") ?? "0")) || 0;
  await prisma.retailOrderItem.update({ where: { id: itemId }, data: { costPrice } });
  revalidatePath(`/retail/orders/${orderId}`);
  revalidatePath("/retail/finance");
}

export async function updateRetailCourierCharge(orderId: number, formData: FormData) {
  "use server";
  const courierCharge = parseFloat(String(formData.get("courierCharge") ?? "0")) || 0;
  await prisma.retailOrder.update({ where: { id: orderId }, data: { courierCharge } });
  revalidatePath(`/retail/orders/${orderId}`);
  revalidatePath("/retail/finance");
}

export async function deleteRetailPayment(paymentId: number, orderId: number) {
  await requireAdmin();
  await prisma.retailPayment.delete({ where: { id: paymentId } });
  const order = await prisma.retailOrder.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) return;
  const totalPaid = order.payments.filter((p) => p.id !== paymentId).reduce((s, p) => s + p.amount, 0);
  const status = totalPaid >= order.totalAmount - 0.01 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "PENDING";
  await prisma.retailOrder.update({ where: { id: orderId }, data: { status } });
  revalidatePath(`/retail/orders/${orderId}`);
  revalidatePath("/retail/orders");
}

export async function deleteRetailOrder(orderId: number) {
  await requireAdmin();
  await prisma.retailOrder.delete({ where: { id: orderId } });
  revalidatePath("/retail/orders");
  redirect("/retail/orders");
}

export async function setRetailDispatched(orderId: number, dispatched: boolean) {
  await prisma.retailOrder.update({
    where: { id: orderId },
    data: {
      dispatched,
      dispatchedAt: dispatched ? new Date() : null,
    },
  });
  revalidatePath(`/retail/orders/${orderId}`);
  revalidatePath("/retail/orders");
}

// ── Retail Customers ──────────────────────────────────────────────────────────

export async function createRetailCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!name) throw new Error("Name is required");
  const customer = await prisma.retailCustomer.create({ data: { name, phone, city, address, notes } });
  revalidatePath("/retail/customers");
  redirect(`/retail/customers/${customer.id}`);
}

export async function updateRetailCustomer(id: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!name) throw new Error("Name is required");
  await prisma.retailCustomer.update({ where: { id }, data: { name, phone, city, address, notes } });
  revalidatePath("/retail/customers");
  revalidatePath(`/retail/customers/${id}`);
  redirect(`/retail/customers/${id}`);
}

export async function deleteRetailCustomer(id: number) {
  await requireAdmin();
  await prisma.retailOrder.updateMany({ where: { retailCustomerId: id }, data: { retailCustomerId: null } });
  await prisma.retailCustomer.delete({ where: { id } });
  revalidatePath("/retail/customers");
  redirect("/retail/customers");
}

export async function submitEmpCommission(formData: FormData) {
  "use server";
  const me = await import("@/lib/auth").then((m) => m.getSessionUser());
  if (!me) throw new Error("Not logged in");
  const date = String(formData.get("date") ?? "");
  const orders = parseInt(String(formData.get("orders") ?? "0"), 10);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!date || orders < 1) throw new Error("Invalid entry");
  await prisma.empCommissionEntry.create({
    data: { userId: me.id, date: new Date(date), orders, note, status: "pending" },
  });
  revalidatePath("/emp-commission");
  redirect("/emp-commission");
}

export async function approveEmpCommission(id: number) {
  "use server";
  await requireAdmin();
  await prisma.empCommissionEntry.update({ where: { id }, data: { status: "approved" } });
  revalidatePath("/emp-commission");
}

export async function rejectEmpCommission(id: number, formData: FormData) {
  "use server";
  await requireAdmin();
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;
  await prisma.empCommissionEntry.update({ where: { id }, data: { status: "rejected", adminNote } });
  revalidatePath("/emp-commission");
}

export async function deleteEmpCommissionEntry(id: number) {
  "use server";
  await requireAdmin();
  await prisma.empCommissionEntry.delete({ where: { id } });
  revalidatePath("/emp-commission");
}

// ── Ecommerce ─────────────────────────────────────────────────────────────────

export async function createEcomOrder(formData: FormData) {
  await requireAuth();
  const customerName = String(formData.get("customerName") ?? "").trim();
  if (!customerName) throw new Error("Customer name is required");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "").trim();
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date();

  const descriptions = formData.getAll("itemDescription").map((v) => String(v).trim());
  const quantities = formData.getAll("itemQuantity").map((v) => parseFloat(String(v)));
  const packSizes = formData.getAll("itemPackSize").map((v) => parseInt(String(v)) || 12);
  const rates = formData.getAll("itemRate").map((v) => parseFloat(String(v)));

  const items = descriptions
    .map((description, i) => ({ description, quantity: quantities[i], packSize: packSizes[i], rate: rates[i] }))
    .filter((it) => it.description && !isNaN(it.quantity) && !isNaN(it.rate));

  if (items.length === 0) throw new Error("At least one item is required");

  const totalAmount = round2(items.reduce((s, i) => s + i.quantity * i.rate, 0));

  const order = await prisma.ecomOrder.create({
    data: {
      customerName,
      phone,
      city,
      notes,
      trackingNumber,
      date,
      totalAmount,
      items: { create: items },
    },
  });

  revalidatePath("/ecommerce");
  revalidatePath("/ecommerce/orders");
  redirect(`/ecommerce/orders/${order.id}`);
}

export async function deleteEcomOrder(orderId: number) {
  await requireAdmin();
  await prisma.ecomOrder.delete({ where: { id: orderId } });
  revalidatePath("/ecommerce");
  revalidatePath("/ecommerce/orders");
  redirect("/ecommerce/orders");
}

export async function updateEcomOrderCosts(orderId: number, formData: FormData) {
  await requireAuth();
  const data: Record<string, number> = {};
  if (formData.has("shippingCost")) data.shippingCost = parseFloat(String(formData.get("shippingCost"))) || 0;
  if (formData.has("adCost")) data.adCost = parseFloat(String(formData.get("adCost"))) || 0;
  if (formData.has("packagingCost")) data.packagingCost = parseFloat(String(formData.get("packagingCost"))) || 0;
  if (formData.has("returnCost")) data.returnCost = parseFloat(String(formData.get("returnCost"))) || 0;
  if (Object.keys(data).length === 0) return;
  await prisma.ecomOrder.update({ where: { id: orderId }, data });
  revalidatePath(`/ecommerce/orders/${orderId}`);
  revalidatePath("/ecommerce/finance");
}

export async function recordEcomPayment(orderId: number, formData: FormData) {
  await requireAuth();
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.ecomPayment.create({ data: { orderId, amount, note } });

  const order = await prisma.ecomOrder.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (order) {
    const received = order.payments.reduce((s, p) => s + p.amount, 0);
    const status = received >= order.totalAmount ? "PAID" : received > 0 ? "PARTIAL" : "PENDING";
    await prisma.ecomOrder.update({ where: { id: orderId }, data: { status } });
  }

  revalidatePath(`/ecommerce/orders/${orderId}`);
  revalidatePath("/ecommerce/finance");
}

export async function deleteEcomPayment(paymentId: number) {
  await requireAdmin();
  const payment = await prisma.ecomPayment.findUnique({ where: { id: paymentId }, include: { order: { include: { payments: true } } } });
  if (!payment) return;
  await prisma.ecomPayment.delete({ where: { id: paymentId } });
  const remaining = payment.order.payments.filter((p) => p.id !== paymentId);
  const received = remaining.reduce((s, p) => s + p.amount, 0);
  const status = received >= payment.order.totalAmount ? "PAID" : received > 0 ? "PARTIAL" : "PENDING";
  await prisma.ecomOrder.update({ where: { id: payment.orderId }, data: { status } });
  revalidatePath(`/ecommerce/orders/${payment.orderId}`);
}

// ── Ecommerce Expenses ────────────────────────────────────────────────────────

export async function createEcomExpense(formData: FormData) {
  await requireAuth();
  const dateRaw = String(formData.get("date") ?? "").trim();
  if (!dateRaw) throw new Error("Date is required");
  const category = String(formData.get("category") ?? "").trim();
  if (!category) throw new Error("Category is required");
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
  const note = String(formData.get("note") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "VARIABLE").trim();
  const dateStr = dateRaw.length === 7 ? `${dateRaw}-01` : dateRaw;

  await prisma.ecomExpense.create({
    data: { date: new Date(dateStr), category, type, amount, note },
  });
  revalidatePath("/ecommerce/expenses");
  revalidatePath("/ecommerce/finance");
}

// ── Employee Performance ──────────────────────────────────────────────────────

export async function logEmpPerformance(formData: FormData) {
  await requireAuth();
  const me = await getSessionUser();
  if (!me) throw new Error("Not logged in");
  const date = String(formData.get("date") ?? "").trim();
  if (!date) throw new Error("Date required");
  const calls = parseInt(String(formData.get("calls") ?? "0")) || 0;
  const confirmations = parseInt(String(formData.get("confirmations") ?? "0")) || 0;
  const newOrders = parseInt(String(formData.get("newOrders") ?? "0")) || 0;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const userId = me.isAdmin && formData.get("userId")
    ? parseInt(String(formData.get("userId")))
    : me.id;

  await prisma.empPerformance.create({
    data: { userId, date: new Date(date), calls, confirmations, newOrders, notes },
  });
  revalidatePath("/performance");
}

export async function deleteEmpPerformance(id: number) {
  await requireAdmin();
  await prisma.empPerformance.delete({ where: { id } });
  revalidatePath("/performance");
}

export async function savePerformanceTarget(formData: FormData) {
  await requireAdmin();
  const calls = parseInt(String(formData.get("calls") ?? "0")) || 0;
  const confirmations = parseInt(String(formData.get("confirmations") ?? "0")) || 0;
  const newOrders = parseInt(String(formData.get("newOrders") ?? "0")) || 0;
  await prisma.performanceTarget.create({ data: { calls, confirmations, newOrders } });
  revalidatePath("/performance");
}

export async function saveAppSetting(key: string, formData: FormData) {
  await requireAdmin();
  const value = String(formData.get("value") ?? "").trim();
  if (!value) throw new Error("Value required");
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  revalidatePath("/ecommerce/settings");
}

export async function deleteAllEcomOrders() {
  await requireAdmin();
  await prisma.$transaction([
    prisma.ecomOrderItem.deleteMany({}),
    prisma.ecomPayment.deleteMany({}),
    prisma.ecomOrder.deleteMany({}),
  ]);
  revalidatePath("/ecommerce/orders");
  revalidatePath("/ecommerce/finance");
}

export async function deleteEcomExpense(id: number) {
  await requireAuth();
  await prisma.ecomExpense.delete({ where: { id } });
  revalidatePath("/ecommerce/expenses");
  revalidatePath("/ecommerce/finance");
}

export async function toggleEcomOrderReturned(orderId: number, formData: FormData) {
  await requireAuth();
  const returned = formData.get("returned") === "true";
  await prisma.ecomOrder.update({ where: { id: orderId }, data: { returned } });
  revalidatePath(`/ecommerce/orders/${orderId}`);
  revalidatePath("/ecommerce/finance");
  revalidatePath("/ecommerce");
}

export async function importEcomOrdersFromCSV(rows: {
  customerName: string;
  phone: string | null;
  city: string | null;
  address: string | null;
  trackingNumber: string | null;
  shopifyOrderId: string | null;
  totalAmount: number;
  date: Date;
  description: string;
}[]): Promise<{ created: number; skipped: number }> {
  await requireAuth();

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.customerName || row.totalAmount == null) { skipped++; continue; }

    await prisma.ecomOrder.create({
      data: {
        customerName: row.customerName,
        phone: row.phone,
        city: row.city,
        address: row.address,
        trackingNumber: row.trackingNumber,
        shopifyOrderId: row.shopifyOrderId,
        totalAmount: row.totalAmount,
        date: row.date,
        items: {
          create: [{
            description: row.description || "Product",
            quantity: 1,
            rate: row.totalAmount,
          }],
        },
      },
    });
    created++;
  }

  revalidatePath("/ecommerce");
  revalidatePath("/ecommerce/orders");
  return { created, skipped };
}

export async function backfillShopifyOrderIds(rows: { trackingNumber: string | null; shopifyOrderId: string | null }[]): Promise<{ updated: number; skipped: number }> {
  await requireAuth();
  let updated = 0, skipped = 0;
  for (const row of rows) {
    if (!row.trackingNumber || !row.shopifyOrderId) { skipped++; continue; }
    const order = await prisma.ecomOrder.findFirst({
      where: { trackingNumber: row.trackingNumber, shopifyOrderId: null },
    });
    if (!order) { skipped++; continue; }
    await prisma.ecomOrder.update({ where: { id: order.id }, data: { shopifyOrderId: row.shopifyOrderId } });
    updated++;
  }
  revalidatePath("/ecommerce/orders");
  return { updated, skipped };
}

export type CPRRow = {
  trackingNumber: string;
  status: "Delivered" | "Return";
  codAmount: number;
  shippingCharges: number;
  netAmount: number;
};

function parseCPRText(text: string): CPRRow[] {
  // PDF text format per order:
  // Line 0: 14-digit tracking number
  // Line 1: "X.XX kgDD/MM/YYYY"
  // Line 2: Origin city
  // Line 3: "Return<shipping><COD>" or "Delivered<shipping><COD>"  (numbers run together)
  // Line 4: "DD/MM/YYYY (D/R)"
  // Line 5: "upfront reserve net SR"  (net may be in parens e.g. (250.13))
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: CPRRow[] = [];

  // Numbers in PDF text are concatenated with exactly 2 decimal places each
  const statusRe = /^(Return|Delivered)(\d[\d,]*\.\d{2})(\d[\d,]*\.\d{2})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\d{14}$/.test(line)) continue;

    const tracking = line;

    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const sLine = lines[j];
      const sm = sLine.match(statusRe);
      if (!sm) continue;

      const isReturn = sm[1] === "Return";
      const shippingCharges = parseFloat(sm[2].replace(/,/g, ""));
      const codAmount = parseFloat(sm[3].replace(/,/g, ""));

      // Next line after date is the amounts line
      for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
        const aLine = lines[k];
        // skip date lines like "15/07/2026 (D/R)"
        if (!/^\d/.test(aLine) || /\d{2}\/\d{2}\/\d{4}/.test(aLine)) continue;
        // Extract the net amount — it's wrapped in parens if negative
        const parenMatch = aLine.match(/\(([\d,]+\.?\d*)\)/);
        let netAmount: number;
        if (parenMatch) {
          netAmount = -parseFloat(parenMatch[1].replace(/,/g, ""));
        } else {
          // Positive net: numbers have exactly 2 decimal places, SR digit appended at end
          const nums = aLine.match(/\d[\d,]*\.\d{2}/g) ?? [];
          netAmount = nums.length >= 3 ? parseFloat(nums[2].replace(/,/g, "")) : 0;
        }
        if (!isNaN(netAmount)) {
          rows.push({ trackingNumber: tracking, status: isReturn ? "Return" : "Delivered", codAmount, shippingCharges, netAmount });
        }
        break;
      }
      break;
    }
  }

  return rows;
}

export async function parseCPRText_action(text: string): Promise<CPRRow[]> {
  await requireAuth();
  return parseCPRText(text);
}

export type CPRPreviewRow = CPRRow & {
  found: boolean;
  customerName: string | null;
  orderId: number | null;
  alreadyProcessed: boolean;
};

async function findOrderByTracking(cprTracking: string) {
  const t = cprTracking.trim();
  const exact = await prisma.ecomOrder.findFirst({ where: { trackingNumber: t } });
  if (exact) return exact;
  const contains = await prisma.ecomOrder.findFirst({ where: { trackingNumber: { contains: t } } });
  if (contains) return contains;
  const candidates = await prisma.ecomOrder.findMany({
    where: { trackingNumber: { not: null } },
    select: { id: true, trackingNumber: true },
  });
  const partial = candidates.find((o) => o.trackingNumber && t.includes(o.trackingNumber));
  if (!partial) return null;
  return prisma.ecomOrder.findUnique({ where: { id: partial.id } });
}

export async function previewCPR(rows: CPRRow[]): Promise<CPRPreviewRow[]> {
  await requireAuth();
  const result: CPRPreviewRow[] = [];
  for (const row of rows) {
    const found = await findOrderByTracking(row.trackingNumber);
    const order = found ? await prisma.ecomOrder.findUnique({
      where: { id: found.id },
      select: { id: true, customerName: true, status: true, returned: true, shippingCost: true, payments: { where: { note: "CPR settlement" }, select: { id: true } } },
    }) : null;
    const alreadyProcessed = !!order && (
      (row.status === "Delivered" && order.payments.length > 0) ||
      (row.status === "Return" && order.returned)
    );
    result.push({
      ...row,
      found: !!order,
      customerName: order?.customerName ?? null,
      orderId: order?.id ?? null,
      alreadyProcessed,
    });
  }
  return result;
}

export async function applyCPR(rows: CPRRow[], fileCount = 1): Promise<{ payments: number; returned: number; notFound: number }> {
  await requireAuth();

  let payments = 0;
  let returned = 0;
  let notFound = 0;

  for (const row of rows) {
    const order = await findOrderByTracking(row.trackingNumber);
    if (!order) { notFound++; continue; }

    if (row.status === "Delivered") {
      const existingCprPayment = await prisma.ecomPayment.findFirst({
        where: { orderId: order.id, note: "CPR settlement" },
      });
      if (existingCprPayment) continue;
      const actualShipping = row.codAmount - row.netAmount;
      if (row.netAmount > 0) {
        await prisma.ecomPayment.create({
          data: { orderId: order.id, amount: row.netAmount, note: "CPR settlement" },
        });
      }
      await prisma.ecomOrder.update({ where: { id: order.id }, data: { status: "PAID", shippingCost: actualShipping } });
      payments++;
    } else if (row.status === "Return") {
      if (order.returned) continue; // already returned
      await prisma.ecomOrder.update({
        where: { id: order.id },
        data: { returned: true, returnCost: row.shippingCharges },
      });
      returned++;
    }
  }

  // record batch for history
  const totalSettled = rows
    .filter((r) => r.status === "Delivered")
    .reduce((s, r) => s + (r.netAmount ?? 0), 0);
  await prisma.cprBatch.create({ data: { fileCount, payments, returned, notFound, totalSettled } });

  revalidatePath("/ecommerce");
  revalidatePath("/ecommerce/orders");
  revalidatePath("/ecommerce/finance");
  revalidatePath("/ecommerce/cpr");
  return { payments, returned, notFound };
}

export async function reportBug(formData: FormData) {
  const me = await requireAuth();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim();
  const page = (formData.get("page") as string | null)?.trim() || null;
  if (!title || !description) throw new Error("Title and description required");
  await prisma.bugReport.create({
    data: { title, description, page, reportedById: me.id },
  });
}

export async function updateBugReportStatus(id: number, status: string, adminNote?: string) {
  await requireAdmin();
  await prisma.bugReport.update({
    where: { id },
    data: { status, ...(adminNote !== undefined ? { adminNote } : {}) },
  });
  revalidatePath("/bug-reports");
}

export async function updateEmpPerformance(id: number, formData: FormData) {
  const me = await requireAuth();
  const entry = await prisma.empPerformance.findUnique({ where: { id } });
  if (!entry) throw new Error("Not found");
  if (!me.isAdmin && entry.userId !== me.id) throw new Error("Unauthorized");

  const calls = parseInt(String(formData.get("calls") ?? "0")) || 0;
  const newOrders = parseInt(String(formData.get("newOrders") ?? "0")) || 0;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.empPerformance.update({
    where: { id },
    data: { calls, newOrders, notes },
  });
  revalidatePath("/performance");
  revalidatePath("/performance/log");
}

export async function deleteEmpPerformanceOwn(id: number) {
  const me = await requireAuth();
  const entry = await prisma.empPerformance.findUnique({ where: { id } });
  if (!entry) throw new Error("Not found");
  if (!me.isAdmin && entry.userId !== me.id) throw new Error("Unauthorized");
  await prisma.empPerformance.delete({ where: { id } });
  revalidatePath("/performance");
  revalidatePath("/performance/log");
}

export async function sendMessage(receiverId: number, body: string) {
  const me = await requireAuth();
  if (!body.trim()) throw new Error("Message cannot be empty");
  await prisma.message.create({ data: { senderId: me.id, receiverId, body: body.trim() } });
  revalidatePath("/messages");
}

export async function markConversationRead(otherUserId: number) {
  const me = await requireAuth();
  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: me.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/messages");
}

export async function bulkImportRetailOrders(rows: {
  customerName: string;
  phone?: string;
  city?: string;
  notes?: string;
  deliveryCharge: number;
  items: { description: string; quantity: number; rate: number }[];
}[]) {
  const me = await requireAuth();
  let created = 0;
  for (const row of rows) {
    if (!row.customerName || row.items.length === 0) continue;
    const totalAmount = round2(row.items.reduce((s, i) => s + i.quantity * i.rate, 0));
    await prisma.retailOrder.create({
      data: {
        customerName: row.customerName,
        phone: row.phone || null,
        city: row.city || null,
        notes: row.notes || null,
        deliveryCharge: row.deliveryCharge,
        totalAmount,
        createdByUserId: me.id,
        status: row.deliveryCharge > 0 ? "PARTIAL" : "PENDING",
        items: { create: row.items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate })) },
        payments: row.deliveryCharge > 0
          ? { create: [{ amount: row.deliveryCharge, note: "Delivery Advance" }] }
          : undefined,
      },
    });
    created++;
  }
  revalidatePath("/retail/orders");
  return created;
}

// ── Reorder Campaign ──────────────────────────────────────────────────────────

export async function createRetailFollowupBatch(name: string) {
  const me = await requireAuth();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);

  const orders = await prisma.retailOrder.findMany({
    where: { date: { lte: cutoff } },
    include: { items: true },
    orderBy: { date: "desc" },
  });

  // Deduplicate by phone — keep most recent order per customer
  const seen = new Map<string, { customerName: string; phone: string; city: string | null; address: string | null; prevItem: string }>();
  for (const o of orders) {
    const phone = o.phone?.trim() || "";
    if (!phone || !o.customerName) continue;
    if (!seen.has(phone)) {
      const prevItem = o.items.map((i) => `${i.description} ×${i.quantity}`).join(", ");
      seen.set(phone, { customerName: o.customerName, phone, city: o.city ?? null, address: null, prevItem });
    }
  }

  const leads = Array.from(seen.values());
  const campaign = await prisma.reorderCampaign.create({
    data: { name, createdById: me.id, isRetailFollowup: true },
  });

  const BATCH = 500;
  for (let i = 0; i < leads.length; i += BATCH) {
    await prisma.reorderLead.createMany({
      data: leads.slice(i, i + BATCH).map((l) => ({ campaignId: campaign.id, ...l })),
    });
  }
  revalidatePath("/reorder");
  return campaign.id;
}

export async function getRetailFollowupCount() {
  await requireAuth();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);
  const orders = await prisma.retailOrder.findMany({
    where: { date: { lte: cutoff } },
    select: { phone: true },
  });
  const unique = new Set(orders.map((o) => o.phone?.trim()).filter(Boolean));
  return unique.size;
}

export async function createReorderCampaign(
  name: string,
  leads: { customerName: string; phone: string; email?: string; address?: string; city?: string; prevItem?: string }[]
) {
  const me = await requireAuth();
  const campaign = await prisma.reorderCampaign.create({
    data: { name, createdById: me.id },
  });

  // Insert leads in batches of 500 to avoid hitting Postgres parameter limits
  const BATCH = 500;
  for (let i = 0; i < leads.length; i += BATCH) {
    await prisma.reorderLead.createMany({
      data: leads.slice(i, i + BATCH).map((l) => ({
        campaignId: campaign.id,
        customerName: l.customerName,
        phone: l.phone,
        email: l.email || null,
        address: l.address || null,
        city: l.city || null,
        prevItem: l.prevItem || null,
      })),
    });
  }

  revalidatePath("/reorder");
  return campaign.id;
}

export async function logReorderCall(
  leadId: number,
  status: string,
  callNote: string,
  followUpDate?: string | null
) {
  const me = await requireAuth();
  const now = new Date();
  const followUp = followUpDate ? new Date(followUpDate) : null;
  // Clear follow-up date if lead is no longer interested
  const clearFollowUp = status !== "ORDER_PLACED";
  await prisma.$transaction([
    prisma.reorderLead.update({
      where: { id: leadId },
      data: {
        status,
        callNote: callNote || null,
        calledAt: now,
        calledById: me.id,
        followUpDate: clearFollowUp ? null : (followUp ?? undefined),
      },
    }),
    prisma.reorderCallLog.create({
      data: { leadId, status, callNote: callNote || null, calledAt: now, calledById: me.id },
    }),
  ]);
  revalidatePath("/reorder");
}

export async function getLeadCallLogs(leadId: number) {
  await requireAuth();
  return prisma.reorderCallLog.findMany({
    where: { leadId },
    include: { calledBy: { select: { displayName: true, username: true, isAdmin: true } } },
    orderBy: { calledAt: "asc" },
  });
}

export async function searchReorderLeads(q: string) {
  await requireAuth();
  const leads = await prisma.reorderLead.findMany({
    where: {
      OR: [
        { customerName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: {
      id: true,
      customerName: true,
      phone: true,
      city: true,
      status: true,
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return leads;
}

export async function deleteReorderLead(leadId: number) {
  await requireAuth();
  await prisma.reorderLead.delete({ where: { id: leadId } });
  revalidatePath("/reorder");
}

export async function markReorderOrderReceived(leadId: number, orderId?: string | null) {
  await requireAuth();
  const note = orderId ? `Order ID: ${orderId}` : "Order received";
  await prisma.reorderLead.update({
    where: { id: leadId },
    data: { status: "ORDER_RECEIVED", followUpDate: null, callNote: note },
  });
  revalidatePath("/reorder");
}

export async function backfillReorderAddresses(
  campaignId: number,
  rows: { phone: string; address: string; email?: string }[]
) {
  await requireAuth();
  const leads = await prisma.reorderLead.findMany({
    where: { campaignId },
    select: { id: true, phone: true },
  });
  const phoneMap = new Map(leads.map((l) => [l.phone.replace(/\s+/g, ""), l.id]));
  let updated = 0;
  for (const row of rows) {
    const phone = row.phone.replace(/\s+/g, "");
    const id = phoneMap.get(phone);
    if (!id || !row.address) continue;
    await prisma.reorderLead.update({
      where: { id },
      data: { address: row.address, ...(row.email ? { email: row.email } : {}) },
    });
    updated++;
  }
  revalidatePath(`/reorder/${campaignId}`);
  return updated;
}

export async function deleteReorderCampaign(id: number) {
  await requireAuth();
  await prisma.reorderCampaign.delete({ where: { id } });
  revalidatePath("/reorder");
}
