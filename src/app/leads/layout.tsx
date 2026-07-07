import { requireView } from "@/lib/requirePermission";

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  await requireView("leads");
  return <>{children}</>;
}
