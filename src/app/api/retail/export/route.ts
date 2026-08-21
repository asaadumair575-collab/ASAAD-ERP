import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import * as XLSX from "xlsx";

const ADDRESS_CODE = "72400";
const RETURN_ADDRESS_CODE = "";
const AIRWAY_BILL_COPIES = 1;
const ORDER_TYPE = "Normal";
// 12 balls = 0.7 kg → each ball = 0.7/12 kg
const KG_PER_BALL = 0.7 / 12;

function itemsNotes(items: { description: string; quantity: number }[]): string {
  return items.map((i) => `${i.description} x${i.quantity}`).join(", ");
}

function calcWeight(items: { quantity: number }[]): number {
  const totalBalls = items.reduce((s, i) => s + i.quantity, 0);
  const raw = totalBalls * KG_PER_BALL;
  return Math.round(raw * 10) / 10; // 1 decimal place
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const status = sp.get("status") || undefined;

  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const orders = await prisma.retailOrder.findMany({
    where: {
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(status ? { status } : {}),
    },
    include: { items: true },
    orderBy: { date: "asc" },
  });

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

    return [
      slipNo,
      o.totalAmount,
      notes,
      o.customerName,
      o.phone ?? "",
      o.address ?? "",
      o.city ?? "",
      totalItems,
      AIRWAY_BILL_COPIES,
      notes,
      ADDRESS_CODE,
      RETURN_ADDRESS_CODE,
      ORDER_TYPE,
      weight,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 35 }, { wch: 22 }, { wch: 16 },
    { wch: 30 }, { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 35 },
    { wch: 14 }, { wch: 18 }, { wch: 42 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `courier-orders-${dateStr}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
