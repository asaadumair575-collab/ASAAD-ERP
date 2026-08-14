"use client";
import { useState, useTransition } from "react";
import { submitComplaint } from "@/lib/actions";
import { CUSTOMER_ISSUES, INTERNAL_ISSUES, type IssueType } from "../issueTypes";

const PRIORITIES = [
  { value: "LOW",    label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH",   label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default function NewComplaintPage() {
  const [group, setGroup] = useState<"INTERNAL" | "CUSTOMER">("INTERNAL");
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [priority, setPriority] = useState("MEDIUM");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const issueList = group === "CUSTOMER" ? CUSTOMER_ISSUES : INTERNAL_ISSUES;

  function handleGroupChange(g: "INTERNAL" | "CUSTOMER") {
    setGroup(g);
    setIssueType(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await submitComplaint(fd);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "digest" in err) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit Complaint</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your complaint will be reviewed by admin.</p>
      </div>

      {/* Step 1 — group */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { val: "INTERNAL", label: "Internal / Software" },
          { val: "CUSTOMER", label: "Customer Complaint" },
        ].map((t) => (
          <button
            key={t.val}
            type="button"
            onClick={() => handleGroupChange(t.val as "INTERNAL" | "CUSTOMER")}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              group === t.val ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Step 2 — issue type tiles */}
      {!issueType && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select issue type</p>
          <div className="grid grid-cols-1 gap-2">
            {issueList.map((it) => (
              <button
                key={it.value}
                type="button"
                onClick={() => setIssueType(it)}
                className="text-left px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-black hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800">{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — form fields */}
      {issueType && (
        <form onSubmit={handleSubmit} className="space-y-4 border border-gray-200 rounded-2xl p-6 bg-white">
          <input type="hidden" name="complaintType" value={group} />
          <input type="hidden" name="issueType" value={issueType.value} />
          <input type="hidden" name="priority" value={priority} />

          {/* selected issue header */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">{issueType.label}</span>
            <button
              type="button"
              onClick={() => setIssueType(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← Change
            </button>
          </div>

          {/* customer name & phone — only for customer complaints */}
          {group === "CUSTOMER" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  required
                  placeholder="Full name"
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
            </div>
          )}

          {/* dynamic fields for this issue type */}
          {issueType.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {field.label}{" "}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === "file" ? (
                <input
                  type="file"
                  name={field.key}
                  required={field.required}
                  accept={"accept" in field ? field.accept : undefined}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-200 file:text-xs file:font-medium file:bg-gray-50 hover:file:bg-gray-100"
                />
              ) : field.type === "select" ? (
                <select
                  name={field.key}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  {"options" in field && field.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.key}
                  required={field.required}
                  placeholder={"placeholder" in field ? field.placeholder : ""}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              )}
            </div>
          ))}

          {/* title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              defaultValue={issueType.defaultTitle}
              placeholder="Brief summary"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Details <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Describe the issue in detail..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          {/* priority */}
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
      )}
    </div>
  );
}
