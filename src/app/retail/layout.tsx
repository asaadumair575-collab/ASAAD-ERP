import { requireView } from "@/lib/requirePermission";

export default async function RetailLayout({ children }: { children: React.ReactNode }) {
  await requireView("retail");
  return <>{children}</>;
}
