import { requireView } from "@/lib/requirePermission";

export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  await requireView("clients");
  return <>{children}</>;
}
