// Retail COD orders get their human-readable "order number" from a
// "Shopify Order <n>" tag Shopify puts in the order's notes field. But
// notes is also where a customer's own free-text instructions land (e.g.
// "Please use leopards courier") — those don't carry that tag, so blindly
// stripping the prefix and falling back to the raw notes text ends up
// showing the customer's note as if it were the order number. Only use the
// notes-derived label when it actually looks like the tag; otherwise fall
// back to the internal id.
export function ecomOrderLabel(order: { id: number; notes: string | null }): string {
  const notes = order.notes?.trim();
  if (notes?.startsWith("Shopify Order ")) {
    const stripped = notes.slice("Shopify Order ".length).trim();
    if (stripped) return stripped;
  }
  return `#${order.id}`;
}
