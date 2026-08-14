import { prisma } from "@/lib/prisma";
import { createRetailOrder } from "@/lib/actions";
import RetailOrderForm from "@/components/RetailOrderForm";

export default async function NewRetailOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; phone?: string; city?: string; address?: string }>;
}) {
  const params = await searchParams;
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  const initialValues = {
    name: params.name,
    phone: params.phone,
    city: params.city,
    address: params.address,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Retail / COD Order</h1>
        {params.name && (
          <p className="text-sm text-green-600 mt-0.5 font-medium">✓ Customer details pre-filled from draft</p>
        )}
      </div>
      <RetailOrderForm action={createRetailOrder} products={products} initialValues={initialValues} />
    </div>
  );
}
