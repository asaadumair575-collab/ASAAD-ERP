import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createEmpCommissionEntry } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";

export default async function NewEmpCommissionPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/emp-commission");

  const employees = await prisma.user.findMany({
    where: { isAdmin: false },
    select: { id: true, username: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/emp-commission" className="text-gray-400 hover:text-black transition-colors">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add Commission Entry</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record daily orders for an employee.</p>
        </div>
      </div>

      <form action={createEmpCommissionEntry} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Employee <span className="text-black">*</span></label>
            <select name="userId" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white">
              <option value="">Select employee…</option>
              {employees.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName ?? u.username}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Date <span className="text-black">*</span></label>
              <input type="date" name="date" required defaultValue={today}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Orders <span className="text-black">*</span></label>
              <input type="number" name="orders" required min={1} placeholder="e.g. 12"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Rate per Order (Rs)</label>
            <input type="number" name="ratePerOrder" defaultValue={30} min={1} step={0.5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
            <p className="text-xs text-gray-400 mt-1">Default Rs 30 per order. Change only if rate differs.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Note (optional)</label>
            <input type="text" name="note" placeholder="e.g. Extra shift"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white" />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/emp-commission" className="flex-1 text-center border border-gray-200 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <SubmitButton pendingText="Saving..." className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
            Save Entry
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
