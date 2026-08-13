import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import ComplaintActions from "../ComplaintActions";

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

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionUser();
  if (!me) notFound();

  const c = await prisma.complaint.findUnique({
    where: { id: parseInt(id, 10) },
    include: { submittedBy: { select: { displayName: true, username: true } } },
  });

  if (!c) notFound();
  if (!me.isAdmin && c.submittedById !== me.id) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/complaints" className="text-sm text-gray-400 hover:text-gray-600">← Complaints</Link>
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
        {/* header */}
        <div className="px-6 py-5 border-b border-gray-100 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-semibold text-gray-900 leading-snug">{c.title}</h1>
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
              {c.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              c.complaintType === "CUSTOMER" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
            }`}>
              {c.complaintType === "CUSTOMER" ? "Customer Complaint" : "Internal"}
            </span>
            <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
              {CATEGORY_LABEL[c.category] ?? c.category}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {me.isAdmin && c.submittedBy
              ? `Submitted by ${c.submittedBy.displayName ?? c.submittedBy.username} · `
              : ""}
            {c.createdAt.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* customer info */}
        {c.complaintType === "CUSTOMER" && (c.customerName || c.customerPhone || c.orderId) && (
          <div className="px-6 py-4 border-b border-gray-100 bg-orange-50 grid grid-cols-3 gap-4">
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

        {/* description */}
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</p>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{c.description}</p>
        </div>

        {/* admin response */}
        {c.adminNote && (
          <div className="px-6 py-5 border-b border-gray-100 bg-blue-50">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Admin Response</p>
            <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{c.adminNote}</p>
          </div>
        )}

        {/* admin action */}
        {me.isAdmin && c.status === "OPEN" && (
          <div className="px-6 py-5">
            <ComplaintActions id={c.id} />
          </div>
        )}
      </div>
    </div>
  );
}
