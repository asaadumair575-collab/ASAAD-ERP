import { requireView } from "@/lib/requirePermission";

export default async function DispatchLayout({ children }: { children: React.ReactNode }) {
  await requireView("dispatch");
  return <>{children}</>;
}
