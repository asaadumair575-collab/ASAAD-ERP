import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/actions";
import InvoiceForm from "@/components/InvoiceForm";

export default async function NewInvoicePage() {
  const [clients, products] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true, name: true, businessName: true, fixedRate: true, fixedRateAmount: true,
        productRates: { select: { productId: true, rate: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select a customer, then add products to bill.
        </p>
      </div>
      <InvoiceForm action={createInvoice} clients={clients} products={products} />
    </div>
  );
}
