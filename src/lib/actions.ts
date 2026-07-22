"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import * as XLSX from "xlsx";
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
  await requireAuth();
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

export async function markRetailOrderReturned(orderId: number, formData: FormData) {
  "use server";
  await requireAuth();
  await prisma.retailOrder.update({
    where: { id: orderId },
    data: { status: "RETURNED" },
  });
  revalidatePath(`/retail/orders/${orderId}`);
  revalidatePath("/retail/orders");
  redirect(`/retail/orders/${orderId}`);
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
