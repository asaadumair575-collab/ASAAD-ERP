import { prisma } from "@/lib/prisma";
import { createRetailOrder } from "@/lib/actions";
import RetailOrderForm from "@/components/RetailOrderForm";

export default async function NewRetailOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; phone?: string; city?: string; address?: string; customerId?: string }>;
}) {
  const params = await searchParams;

  const customerIdRaw = params.customerId ? parseInt(params.customerId, 10) : null;
  const [products, preselectedCustomer] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    customerIdRaw ? prisma.retailCustomer.findUnique({ where: { id: customerIdRaw } }) : Promise.resolve(null),
  ]);

  const customers = await prisma.retailCustomer.findMany({ orderBy: { name: "asc" }, take: 200 });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Retail / COD Order</h1>
        {preselectedCustomer && (
          <p className="text-sm text-green-600 mt-0.5 font-medium">✓ Customer selected: {preselectedCustomer.name}</p>
        )}
      </div>
      <RetailOrderForm
        action={createRetailOrder}
        products={products}
        customers={customers}
        preselectedCustomer={preselectedCustomer ?? undefined}
      />
    </div>
  );
}
