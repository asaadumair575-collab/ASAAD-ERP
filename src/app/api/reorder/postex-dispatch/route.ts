import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const POSTEX_BASE = "https://api.postex.pk/services/integration/api";
const POSTEX_TOKEN = process.env.POSTEX_RETAIL_API_TOKEN ?? "";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, amount } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const lead = await prisma.reorderLead.findUnique({
    where: { id: Number(leadId) },
    select: { id: true, customerName: true, phone: true, city: true, address: true, callNote: true, postexTrackingNumber: true },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.postexTrackingNumber) {
    return NextResponse.json({ ok: true, tracking: lead.postexTrackingNumber, alreadyDispatched: true });
  }

  const invoiceNumber = `RL-${lead.id}`;
  const cod = Number(amount) || 0;

  try {
    const res = await fetch(`${POSTEX_BASE}/order/v3/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: POSTEX_TOKEN },
      body: JSON.stringify({
        orderType: "Normal",
        pickupAddressCode: "001",
        orderRefNumber: invoiceNumber,
        cityName: lead.city ?? "Karachi",
        customerName: lead.customerName,
        customerPhone: lead.phone,
        deliveryAddress: lead.address ?? lead.city ?? "",
        invoicePayment: cod,
        invoiceNumber: invoiceNumber,
        items: 1,
        orderDetail: invoiceNumber,
        transactionNotes: invoiceNumber,
      }),
    });

    const data = await res.json();
    console.log("[Retail Postex response]", JSON.stringify(data));

    if (!res.ok || data?.statusCode === false || data?.status === false) {
      const msg = data?.statusMessage ?? data?.message ?? `Postex error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const tracking =
      data?.dist?.trackingNumber ??
      data?.trackingNumber ??
      data?.data?.trackingNumber ??
      null;

    if (!tracking) {
      return NextResponse.json({ error: `No tracking number: ${JSON.stringify(data)}` }, { status: 400 });
    }

    await prisma.reorderLead.update({
      where: { id: lead.id },
      data: { postexTrackingNumber: tracking },
    });

    return NextResponse.json({ ok: true, tracking });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
