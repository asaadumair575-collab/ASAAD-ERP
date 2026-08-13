"use client";
import { useState, useTransition } from "react";
import { submitComplaint } from "@/lib/actions";

const INTERNAL_CATEGORIES = [
  { value: "GENERAL",   label: "General" },
  { value: "WORKPLACE", label: "Workplace" },
  { value: "SALARY",    label: "Salary / Pay" },
  { value: "WORKLOAD",  label: "Workload" },
  { value: "SOFTWARE",  label: "Software Issue" },
  { value: "OTHER",     label: "Other" },
];

const CUSTOMER_CATEGORIES = [
  { value: "QUALITY",   label: "Product Quality" },
  { value: "DELIVERY",  label: "Delivery Issue" },
  { value: "PAYMENT",   label: "Payment Issue" },
  { value: "BEHAVIOR",  label: "Staff Behavior" },
  { value: "OTHER",     label: "Other" },
];

const PRIORITIES = [
  { value: "LOW",    label: "Low",    color: "bg-gray-100 text-gray-600" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "HIGH",   label: "High",   color: "bg-orange-100 text-orange-700" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-700" },
];

export default function NewComplaintPage() {
  const [type, setType] = useState<"INTERNAL" | "CUSTOMER">("INTERNAL");
  const [priority, setPriority] = useState("MEDIUM");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await submitComplaint(fd);
      } catch (err: unknown) {
        // re-throw Next.js redirect — it must not be swallowed
        if (err && typeof err === "object" && "digest" in err) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const categories = type === "CUSTOMER" ? CUSTOMER_CATEGORIES : INTERNAL_CATEGORIES;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit Complaint</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your complaint will be reviewed by admin.</p>
      </div>

      {/* type toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { val: "INTERNAL", label: "Internal / Software" },
          { val: "CUSTOMER", label: "Customer Complaint" },
        ].map((t) => (
          <button
            key={t.val}
            type="button"
            onClick={() => setType(t.val as "INTERNAL" | "CUSTOMER")}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              type === t.val ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border border-gray-200 rounded-2xl p-6 bg-white">
        <input type="hidden" name="complaintType" value={type} />
        <input type="hidden" name="priority" value={priority} />

        {/* customer-only fields */}
        {type === "CUSTOMER" && (
          <div className="space-y-4 pb-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customerName"
                required
                placeholder="Full name of the customer"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Customer Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="customerPhone"
                required
                placeholder="+92 3XX XXXXXXX"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Order ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="orderId"
                required
                placeholder="e.g. INV-1234 or #5678"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  priority === p.value
                    ? "border-black bg-black text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
          <select
            name="category"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="Brief summary of the issue"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Details <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            required
            rows={5}
            placeholder="Describe the issue in detail..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {pending ? "Submitting..." : "Submit Complaint"}
          </button>
          <a href="/complaints" className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2.5">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
