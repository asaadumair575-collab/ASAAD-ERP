"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  const client = await prisma.client.create({
    data: { name, businessName, city, phone, address, notes },
  });

  revalidatePath("/clients");
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
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: number) {
  await prisma.order.deleteMany({ where: { clientId: id } });
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
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

  const saleAmount = items.reduce((s, i) => s + i.quantity * i.rate, 0);

  await prisma.order.create({
    data: {
      clientId,
      purchaseAmount,
      saleAmount,
      date,
      items: { create: items },
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function deleteOrder(orderId: number, clientId: number) {
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
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
  const purchaseAmount = parseFloat(String(formData.get("purchaseAmount") ?? "0"));
  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(dateRaw) : new Date();

  if (Number.isNaN(clientId)) {
    throw new Error("Please select a customer");
  }
  if (Number.isNaN(purchaseAmount)) {
    throw new Error("Purchase amount must be a number");
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
      return {
        productId:
          parsedProductId !== null && existingProductIds.has(parsedProductId)
            ? parsedProductId
            : null,
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

  const saleAmount = items.reduce((s, i) => s + i.quantity * i.rate, 0);

  const order = await prisma.order.create({
    data: {
      clientId,
      purchaseAmount,
      saleAmount,
      date,
      items: { create: items },
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

  const alreadyPaid = order.payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = order.saleAmount - alreadyPaid;
  if (amount > balanceDue + 0.01) {
    throw new Error("Payment exceeds the remaining balance due");
  }

  const newPaid = alreadyPaid + amount;
  const paymentStatus =
    newPaid >= order.saleAmount - 0.01
      ? "PAID"
      : newPaid > 0
        ? "PARTIAL"
        : "UNPAID";

  await prisma.payment.create({ data: { orderId, amount } });
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

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const rate = parseFloat(String(formData.get("rate") ?? "0"));

  if (!name || Number.isNaN(rate)) {
    throw new Error("Name and rate are required");
  }

  await prisma.product.create({ data: { name, rate } });
  revalidatePath("/sales/products");
  redirect("/sales/products");
}

export async function deleteProduct(id: number) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/sales/products");
}

export async function saveBusinessProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name) {
    throw new Error("Business name is required");
  }

  const existing = await prisma.businessProfile.findFirst();
  if (existing) {
    await prisma.businessProfile.update({
      where: { id: existing.id },
      data: { name, phone, address },
    });
  } else {
    await prisma.businessProfile.create({ data: { name, phone, address } });
  }

  revalidatePath("/settings");
}
