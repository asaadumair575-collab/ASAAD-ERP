import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import ComplaintCard from "./ComplaintCard";

export default async function ComplaintsPage() {
  const me = await getSessionUser();
  if (!me) notFound();

  const complaints = await prisma.complaint.findMany({
    where: me.isAdmin ? undefined : { submittedById: me.id },
    orderBy: { createdAt: "desc" },
    include: { submittedBy: { select: { displayName: true, username: true } } },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {me.isAdmin ? "All employee complaints" : "Your submitted complaints"}
          </p>
        </div>
        <Link
          href="/complaints/new"
          className="text-sm font-medium bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Complaint
        </Link>
      </div>

      {complaints.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No complaints yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <ComplaintCard key={c.id} c={c} isAdmin={me.isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
