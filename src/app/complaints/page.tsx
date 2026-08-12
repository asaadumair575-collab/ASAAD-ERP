import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import ComplaintActions from "./ComplaintActions";

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL:   "General",
  WORKPLACE: "Workplace",
  SALARY:    "Salary / Pay",
  WORKLOAD:  "Workload",
  SOFTWARE:  "Software Issue",
  QUALITY:   "Product Quality",
  DELIVERY:  "Delivery Issue",
  PAYMENT:   "Payment Issue",
  BEHAVIOR:  "Staff Behavior",
  OTHER:     "Other",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN:        "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED:    "bg-green-100 text-green-800",
  DISMISSED:   "bg-gray-100 text-gray-500",
};

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
            <div key={c.id} className="border border-gray-200 rounded-2xl p-5 space-y-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {c.status.replace("_", " ")}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      c.complaintType === "CUSTOMER"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {c.complaintType === "CUSTOMER" ? "Customer" : "Internal"}
                    </span>
                    <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
                      {CATEGORY_LABEL[c.category] ?? c.category}
                    </span>
                  </div>

                  {me.isAdmin && c.submittedBy && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      by {c.submittedBy.displayName ?? c.submittedBy.username} · {c.createdAt.toLocaleDateString()}
                    </p>
                  )}
                  {!me.isAdmin && (
                    <p className="text-xs text-gray-400 mt-0.5">{c.createdAt.toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {/* customer info block */}
              {c.complaintType === "CUSTOMER" && (c.customerName || c.customerPhone || c.orderId) && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 grid grid-cols-3 gap-3">
                  {c.customerName && (
                    <div>
                      <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-0.5">Customer</p>
                      <p className="text-sm text-orange-900 font-medium">{c.customerName}</p>
                    </div>
                  )}
                  {c.customerPhone && (
                    <div>
                      <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-0.5">Phone</p>
                      <p className="text-sm text-orange-900 font-medium">{c.customerPhone}</p>
                    </div>
                  )}
                  {c.orderId && (
                    <div>
                      <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-0.5">Order ID</p>
                      <p className="text-sm text-orange-900 font-medium">{c.orderId}</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 whitespace-pre-line">{c.description}</p>

              {c.adminNote && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Admin Response</p>
                  <p className="text-sm text-blue-800 whitespace-pre-line">{c.adminNote}</p>
                </div>
              )}

              {me.isAdmin && c.status === "OPEN" && (
                <ComplaintActions id={c.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
