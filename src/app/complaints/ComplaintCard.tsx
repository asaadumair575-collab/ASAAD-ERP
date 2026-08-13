"use client";
import { useState } from "react";
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

type Complaint = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  complaintType: string;
  customerName: string | null;
  customerPhone: string | null;
  orderId: string | null;
  adminNote: string | null;
  createdAt: Date;
  submittedBy: { displayName: string | null; username: string } | null;
};

export default function ComplaintCard({
  c,
  isAdmin,
}: {
  c: Complaint;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* header row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{c.title}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
              {c.status.replace("_", " ")}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
              c.complaintType === "CUSTOMER"
                ? "bg-orange-100 text-orange-700"
                : "bg-purple-100 text-purple-700"
            }`}>
              {c.complaintType === "CUSTOMER" ? "Customer" : "Internal"}
            </span>
            <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 shrink-0">
              {CATEGORY_LABEL[c.category] ?? c.category}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {isAdmin && c.submittedBy
              ? `by ${c.submittedBy.displayName ?? c.submittedBy.username} · `
              : ""}
            {c.createdAt.toLocaleDateString()}
          </p>
        </div>
        <span className="text-gray-400 text-xs shrink-0 select-none">
          {open ? "▲ Hide" : "▼ Details"}
        </span>
      </button>

      {/* expanded detail */}
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
          {/* customer info */}
          {c.complaintType === "CUSTOMER" && (c.customerName || c.customerPhone || c.orderId) && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 grid grid-cols-3 gap-3 mt-3">
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

          <p className="text-sm text-gray-600 whitespace-pre-line pt-1">{c.description}</p>

          {c.adminNote && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Admin Response</p>
              <p className="text-sm text-blue-800 whitespace-pre-line">{c.adminNote}</p>
            </div>
          )}

          {isAdmin && c.status === "OPEN" && <ComplaintActions id={c.id} />}
        </div>
      )}
    </div>
  );
}
