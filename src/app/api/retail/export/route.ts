import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import * as XLSX from "xlsx";

const ADDRESS_CODE = "001";
const RETURN_ADDRESS_CODE = "001";
const AIRWAY_BILL_COPIES = 1;
const ORDER_TYPE = "Normal";
const KG_PER_BALL = 0.7 / 12;

function itemsNotes(items: { description: string; quantity: number }[]): string {
  return items.map((i) => `${i.description} x${i.quantity}`).join(", ");
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return "0" + digits.slice(2);
  return phone;
}

function calcWeight(items: { quantity: number }[]): number {
  const totalBalls = items.reduce((s, i) => s + i.quantity, 0);
  return Math.round(totalBalls * KG_PER_BALL * 10) / 10;
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);

  const orders = await prisma.retailOrder.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
    },
    include: {
      items: true,
      payments: true,
      retailCustomer: { select: { address: true } },
    },
    orderBy: { date: "asc" },
  });

  if (orders.length === 0) {
    return NextResponse.json({ error: "No orders found for this date." }, { status: 404 });
  }

  const headers = [
    "Order Reference Number",
    "Order Amount",
    "Order Detail",
    "Customer Name",
    "Customer Phone",
    "Order Address",
    "City",
    "Items",
    "Airway Bill Copies",
    "Notes",
    "Address Code",
    "Return Address Code",
    "Order Type (Normal/Reversed/Replacement/Overland)",
    "Booking Weight",
  ];

  const rows = orders.map((o) => {
    const slipNo = `R-${String(o.id).padStart(3, "0")}`;
    const notes = itemsNotes(o.items);
    const weight = calcWeight(o.items);
    const totalItems = o.items.reduce((s, i) => s + i.quantity, 0);
    const received = o.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, o.totalAmount - received);
    const address = o.address || o.retailCustomer?.address || "";
    return [
      slipNo, balance, notes, o.customerName,
      o.phone ? normalizePhone(o.phone) : "", address, o.city ?? "",
      totalItems, AIRWAY_BILL_COPIES, notes,
      ADDRESS_CODE, RETURN_ADDRESS_CODE, ORDER_TYPE, weight,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 35 }, { wch: 22 }, { wch: 16 },
    { wch: 30 }, { wch: 14 }, { wch: 8 },  { wch: 18 }, { wch: 35 },
    { wch: 14 }, { wch: 18 }, { wch: 42 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // Log this export and get sequential number
  await prisma.retailExportLog.create({ data: { date: from } });
  const exportCount = await prisma.retailExportLog.count({ where: { date: from } });

  const filename = `Courier Upload ${from} (${exportCount}).xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
