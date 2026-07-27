import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "customers";
  const today = new Date().toISOString().slice(0, 10);

  if (type === "customers") {
    const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
    const csv = toCSV(
      ["ID", "Name", "Business/Shop", "City", "Phone", "Address", "Notes", "Created"],
      clients.map((c) => [c.id, c.name, c.businessName, c.city, c.phone, c.address, c.notes, c.createdAt?.toISOString().slice(0, 10)])
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="customers-${today}.csv"`,
      },
    });
  }

  if (type === "ecom-orders") {
    const orders = await prisma.ecomOrder.findMany({ orderBy: { date: "desc" }, include: { items: true } });
    const csv = toCSV(
      ["ID", "Order Ref", "Customer", "Phone", "City", "Address", "Tracking", "Date", "Status", "Returned", "Total Amount", "Items"],
      orders.map((o) => [
        o.id, o.shopifyOrderId, o.customerName, o.phone, o.city, o.address,
        o.trackingNumber, o.date.toISOString().slice(0, 10), o.status, o.returned ? "Yes" : "No",
        o.totalAmount, o.items.map((i) => `${i.description} x${i.quantity}`).join("; "),
      ])
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="retail-cod-orders-${today}.csv"`,
      },
    });
  }

  if (type === "invoices") {
    const orders = await prisma.order.findMany({
      orderBy: { date: "desc" },
      include: { client: true, items: true },
    });
    const csv = toCSV(
      ["ID", "Customer", "City", "Date", "Purchase Amount", "Sale Amount", "Discount", "Payment Status", "Order Type", "Notes"],
      orders.map((o) => [
        o.id, o.client?.name, o.client?.city,
        o.date.toISOString().slice(0, 10), o.purchaseAmount, o.saleAmount,
        o.discount, o.paymentStatus, o.orderType, o.notes,
      ])
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="invoices-${today}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
