import Link from "next/link";
import Logo from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";
import { adminLogout } from "../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2"><Logo small /><span className="text-xs font-medium text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">Admin</span></Link>
          <span className="ml-auto text-sm text-gray-500 hidden sm:inline">{admin.email}</span>
          <form action={adminLogout}><button className="text-sm text-gray-600 hover:text-gray-900">Sign out</button></form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
