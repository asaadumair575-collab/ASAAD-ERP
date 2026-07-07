import { requireView } from "@/lib/requirePermission";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  await requireView("sales");
  return <>{children}</>;
}
