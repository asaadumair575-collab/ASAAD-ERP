import Link from "next/link";

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

type Complaint = {
  id: number;
  title: string;
  category: string;
  status: string;
  complaintType: string;
  createdAt: Date;
  submittedBy: { displayName: string | null; username: string } | null;
};

export default function ComplaintCard({ c, isAdmin }: { c: Complaint; isAdmin: boolean }) {
  return (
    <div className="border border-gray-200 rounded-2xl px-5 py-4 bg-white flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">{c.title}</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
            {c.status.replace("_", " ")}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
            c.complaintType === "CUSTOMER" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
          }`}>
            {c.complaintType === "CUSTOMER" ? "Customer" : "Internal"}
          </span>
          <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 shrink-0">
            {CATEGORY_LABEL[c.category] ?? c.category}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {isAdmin && c.submittedBy ? `${c.submittedBy.displayName ?? c.submittedBy.username} · ` : ""}
          {c.createdAt.toLocaleDateString()}
        </p>
      </div>
      <Link
        href={`/complaints/${c.id}`}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shrink-0"
      >
        Open
      </Link>
    </div>
  );
}
