import type { OrderStatus, ShipmentStatus } from "@/generated/prisma/client";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Your Company";

export const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });

export const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });

export function timeAgo(d: Date | string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.round(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  NEW: { label: "New", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  CONFIRMED: { label: "Confirmed", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  BOOKED: { label: "Booked", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  IN_TRANSIT: { label: "In transit", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  DELIVERED: { label: "Delivered", cls: "bg-green-50 text-green-700 ring-green-200" },
  RETURNED: { label: "Returned", cls: "bg-red-50 text-red-700 ring-red-200" },
  CANCELLED: { label: "Cancelled", cls: "bg-gray-100 text-gray-600 ring-gray-200" },
};

export const SHIPMENT_STATUS: Record<ShipmentStatus, { label: string; cls: string }> = {
  BOOKED: { label: "Booked", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  IN_TRANSIT: { label: "In transit", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  DELIVERED: { label: "Delivered", cls: "bg-green-50 text-green-700 ring-green-200" },
  RETURNED: { label: "Returned", cls: "bg-red-50 text-red-700 ring-red-200" },
  CANCELLED: { label: "Cancelled", cls: "bg-gray-100 text-gray-600 ring-gray-200" },
};

export function daysLeft(expiresAt: Date | null) {
  if (!expiresAt) return null;
  return Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
}

export function whatsappLink(phone: string | null, text: string) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Clock helpers — kept here so pages don't read the clock directly while rendering.
export const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);
export const msSince = (d: Date) => Date.now() - d.getTime();
