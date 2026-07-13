import { prisma } from "@/lib/prisma";
import { createRetailOrder } from "@/lib/actions";
import RetailOrderForm from "@/components/RetailOrderForm";

export default async function NewRetailOrderPage() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Retail / COD Order</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Record a delivery advance and ship the goods. Collect the remaining payment later.
        </p>
      </div>
      <RetailOrderForm action={createRetailOrder} products={products} />
    </div>
  );
}
