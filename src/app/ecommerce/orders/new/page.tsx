import { createEcomOrder } from "@/lib/actions";
import EcomOrderForm from "@/components/EcomOrderForm";

export default function NewEcomOrderPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Ecommerce Order</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new ecommerce order</p>
      </div>
      <EcomOrderForm action={createEcomOrder} />
    </div>
  );
}
