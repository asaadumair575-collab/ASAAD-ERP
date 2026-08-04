import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CallingPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.isAdmin) redirect("/calling/dashboard");
  redirect("/calling/queue");
}
