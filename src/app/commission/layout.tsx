import { requireView } from "@/lib/requirePermission";

export default async function CommissionLayout({ children }: { children: React.ReactNode }) {
  await requireView("commission");
  return <>{children}</>;
}
