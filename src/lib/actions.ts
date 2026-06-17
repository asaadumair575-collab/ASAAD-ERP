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
