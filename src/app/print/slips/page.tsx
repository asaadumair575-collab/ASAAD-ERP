import type { Metadata } from "next";
import Barcode from "@/components/Barcode";
import PrintButton from "@/components/PrintButton";
import { requireUser } from "@/lib/auth";
import { courierName } from "@/lib/couriers";
import { db } from "@/lib/db";
import { fmtDate, money } from "@/lib/format";

export const metadata: Metadata = { title: "Packing slips" };

export default async function SlipsPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const user = await requireUser();
  const ids = ((await searchParams).ids ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  const orders = await db.order.findMany({
    where: { tenantId: user.tenantId, id: { in: ids } },
    include: { items: true, shipment: true },
    orderBy: { placedAt: "asc" },
  });
  const t = user.tenant;

  return (
    <main className="min-h-dvh bg-gray-100 print:bg-white py-6 print:py-0">
      <div className="no-print max-w-[720px] mx-auto mb-4 px-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">{orders.length} slip{orders.length === 1 ? "" : "s"} · two per A4 page</p>
        <PrintButton />
      </div>
      <div className="max-w-[720px] mx-auto space-y-4 print:space-y-0">
        {orders.map((o, idx) => {
          const s = o.shipment;
          const cod = o.paymentMethod === "COD" ? (s?.codAmount ?? o.total) : 0;
          return (
            <section key={o.id} className={`bg-white border-2 border-black text-black text-[13px] print:break-inside-avoid ${idx % 2 === 1 ? "print:break-after-page" : "print:mb-[8mm]"}`}>
              <div className="grid grid-cols-2 border-b-2 border-black">
                <div className="p-3 border-r-2 border-black">
                  <p className="text-[11px] uppercase font-semibold">From</p>
                  <p className="font-bold text-base">{t.name}</p>
                  {t.phone && <p>{t.phone}</p>}
                  {t.address && <p className="text-xs">{t.address}</p>}
                </div>
                <div className="p-3">
                  <p className="text-[11px] uppercase font-semibold">{s ? courierName(s.courier) : "Courier"}</p>
                  {s ? <><Barcode value={s.trackingNumber} height={44} /><p className="font-mono font-bold text-center tracking-wider">{s.trackingNumber}</p></> : <p className="text-gray-500 mt-3">Not booked yet</p>}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] border-b-2 border-black">
                <div className="p-3 border-r-2 border-black">
                  <p className="text-[11px] uppercase font-semibold">Deliver to</p>
                  <p className="font-bold text-base">{o.customerName}</p>
                  <p className="font-semibold">{o.phone}</p>
                  <p>{o.address}</p>
                  <p className="font-bold text-base uppercase mt-0.5">{o.city}</p>
                </div>
                <div className="p-3 flex flex-col items-center justify-center min-w-40">
                  <p className="text-[11px] uppercase font-semibold">{cod ? "Collect cash" : "Prepaid"}</p>
                  <p className="text-2xl font-black">{cod ? money(cod) : "Rs 0"}</p>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto]">
                <table className="w-full text-xs border-r-2 border-black">
                  <thead><tr className="border-b border-black"><th className="text-left p-1.5 pl-3">Item</th><th className="p-1.5">Qty</th><th className="text-right p-1.5 pr-3">Price</th></tr></thead>
                  <tbody>
                    {o.items.map((i) => (
                      <tr key={i.id}><td className="p-1.5 pl-3">{i.title}{i.sku ? ` (${i.sku})` : ""}</td><td className="text-center">{i.qty}</td><td className="text-right p-1.5 pr-3">{money(i.price * i.qty)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 w-48">
                  <Barcode value={o.number.replace(/^#/, "")} height={32} />
                  <p className="text-center font-bold">Order {o.number}</p>
                  <p className="text-center text-[11px]">{fmtDate(o.placedAt)}</p>
                </div>
              </div>
            </section>
          );
        })}
        {!orders.length && <p className="text-center text-gray-500 py-20">No orders selected.</p>}
      </div>
    </main>
  );
}
