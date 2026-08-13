import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import ComplaintActions from "../ComplaintActions";
import DeleteComplaintButton from "../DeleteComplaintButton";
import PriorityBadge from "../PriorityBadge";
import PriorityChanger from "../PriorityChanger";
import { ISSUE_TYPES } from "../issueTypes";

const STATUS_STYLE: Record<string, string> = {
  OPEN:        "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED:    "bg-green-100 text-green-800",
  DISMISSED:   "bg-gray-100 text-gray-500",
};

// Human-readable labels for dynamic metadata keys
const META_LABELS: Record<string, string> = {
  orderId:       "Order ID",
  amount:        "Amount (₨)",
  month:         "Month",
  customerName:  "Customer Name",
  customerPhone: "Customer Phone",
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

  const issueType = ISSUE_TYPES.find((t) => t.value === c.category);
  const meta = (c.metadata ?? {}) as Record<string, string>;

  // separate photo/image entries from text entries
  const textMeta = Object.entries(meta).filter(([, v]) => !v.startsWith("data:image"));
  const photoMeta = Object.entries(meta).filter(([, v]) => v.startsWith("data:image"));

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/complaints" className="text-sm text-gray-400 hover:text-gray-600">← Complaints</Link>
        {me.isAdmin && <DeleteComplaintButton id={c.id} />}
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
            <PriorityBadge priority={c.priority} />
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              c.complaintType === "CUSTOMER" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
            }`}>
              {c.complaintType === "CUSTOMER" ? "Customer Complaint" : "Internal"}
            </span>
            {issueType && (
              <span className="text-[11px] text-gray-500 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
                {issueType.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {me.isAdmin && c.submittedBy
              ? `Submitted by ${c.submittedBy.displayName ?? c.submittedBy.username} · `
              : ""}
            {c.createdAt.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* dynamic text metadata */}
        {textMeta.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 grid grid-cols-2 gap-4">
            {textMeta.map(([key, val]) => (
              <div key={key}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  {META_LABELS[key] ?? key}
                </p>
                <p className="text-sm text-gray-800 font-medium">{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* description */}
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</p>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{c.description}</p>
        </div>

        {/* photo attachments */}
        {photoMeta.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Attached Photos</p>
            <div className="flex flex-wrap gap-3">
              {photoMeta.map(([key, val]) => (
                <a key={key} href={val} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={val}
                    alt={META_LABELS[key] ?? key}
                    className="h-32 w-auto rounded-xl border border-gray-200 object-cover hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* admin response */}
        {c.adminNote && (
          <div className="px-6 py-5 border-b border-gray-100 bg-blue-50">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Admin Response</p>
            <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{c.adminNote}</p>
          </div>
        )}

        {/* admin actions */}
        {me.isAdmin && (
          <div className="px-6 py-5 space-y-4 border-t border-gray-100">
            <PriorityChanger id={c.id} current={c.priority} />
            {c.status === "OPEN" && <ComplaintActions id={c.id} />}
          </div>
        )}
      </div>
    </div>
  );
}
