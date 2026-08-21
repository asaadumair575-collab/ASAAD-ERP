import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import * as XLSX from "xlsx";

const ADDRESS_CODE = "72400";
const RETURN_ADDRESS_CODE = "";
const AIRWAY_BILL_COPIES = 1;
const ORDER_TYPE = "Normal";
const KG_PER_BALL = 0.7 / 12;

function itemsNotes(items: { description: string; quantity: number }[]): string {
  return items.map((i) => `${i.description} x${i.quantity}`).join(", ");
}

function calcWeight(items: { quantity: number }[]): number {
  const totalBalls = items.reduce((s, i) => s + i.quantity, 0);
  return Math.round(totalBalls * KG_PER_BALL * 10) / 10;
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);

  const orders = await prisma.retailOrder.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
      exportedAt: null,
    },
    include: { items: true },
    orderBy: { date: "asc" },
  });

  if (orders.length === 0) {
    return NextResponse.json({ error: "No un-exported orders in this date range." }, { status: 404 });
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
    return [
      slipNo, o.totalAmount, notes, o.customerName,
      o.phone ?? "", o.address ?? "", o.city ?? "",
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

  // Mark all exported orders
  await prisma.retailOrder.updateMany({
    where: { id: { in: orders.map((o) => o.id) } },
    data: { exportedAt: new Date() },
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `courier-orders-${from}-to-${to}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
