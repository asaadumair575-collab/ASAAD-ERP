import Link from "next/link";
import Logo from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";
import { adminLogout } from "../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2.5"><Logo small light /><span className="text-[11px] font-semibold text-gray-950 bg-white rounded-full px-2 py-0.5">ADMIN</span></Link>
          <span className="ml-auto text-sm text-gray-400 hidden sm:inline">{admin.email}</span>
          <form action={adminLogout}><button className="text-sm text-gray-300 hover:text-white">Sign out</button></form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
