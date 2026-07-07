import { requireView } from "@/lib/requirePermission";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireView("finance");
  return <>{children}</>;
}
