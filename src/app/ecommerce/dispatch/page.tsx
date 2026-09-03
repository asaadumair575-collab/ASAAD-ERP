import { redirect } from "next/navigation";

// Scan & Weigh and Generate Dispatch List now live directly on the
// Confirm Orders page — this route just redirects there.
export default function DispatchRedirect() {
  redirect("/ecommerce/orders");
}
