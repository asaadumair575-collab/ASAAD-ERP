import type { Metadata } from "next";
import DemoShell from "./_components/DemoShell";

export const metadata: Metadata = {
  title: "Your Company ERP",
  description: "Shopify orders, courier booking, tracking and COD in one place.",
};

// Public demo with dummy data only — rendered outside the real app shell
// (see the root layout) and never reads the real database.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
