import Link from "next/link";
import { Card, Field, PageHeader, btn, inputCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { createManualOrder } from "../../actions";

export default async function NewOrderPage() {
  const user = await requireUser();
  const products = await db.product.findMany({ where: { tenantId: user.tenantId }, orderBy: { title: "asc" } });
  return (
    <div className="max-w-2xl">
      <Link href="/app/orders" className="text-sm text-gray-500 hover:text-gray-900">← Orders</Link>
      <PageHeader title="New order" description="For orders from WhatsApp, Instagram or phone calls." />
      <Card className="p-5">
        <form action={createManualOrder} className="grid sm:grid-cols-2 gap-4">
          <Field label="Customer name"><input name="customerName" required className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" required className={inputCls} placeholder="03xx xxxxxxx" /></Field>
          <Field label="City"><input name="city" required className={inputCls} /></Field>
          <Field label="Payment">
            <select name="payment" className={inputCls}><option value="COD">Cash on delivery</option><option value="PREPAID">Paid online</option></select>
          </Field>
          <div className="sm:col-span-2"><Field label="Address"><textarea name="address" required rows={2} className={`${inputCls} h-auto py-2`} /></Field></div>
          <Field label="Product">
            <select name="productId" className={inputCls}>
              <option value="">Other item…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.title}{p.variantTitle ? ` — ${p.variantTitle}` : ""} ({money(p.price)})</option>)}
            </select>
          </Field>
          <Field label="Item name" hint="Only if not in the list"><input name="itemTitle" className={inputCls} /></Field>
          <Field label="Quantity"><input name="qty" type="number" min={1} defaultValue={1} className={inputCls} /></Field>
          <Field label="Price per item" hint="Leave empty to use the product price"><input name="price" type="number" min={0} className={inputCls} /></Field>
          <Field label="Delivery charge"><input name="shippingFee" type="number" min={0} defaultValue={0} className={inputCls} /></Field>
          <div className="sm:col-span-2"><button className={btn("primary")}>Create order</button></div>
        </form>
      </Card>
    </div>
  );
}
