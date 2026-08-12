import { submitComplaint } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

const CATEGORIES = [
  { value: "GENERAL",   label: "General" },
  { value: "WORKPLACE", label: "Workplace" },
  { value: "SALARY",    label: "Salary / Pay" },
  { value: "WORKLOAD",  label: "Workload" },
  { value: "OTHER",     label: "Other" },
];

export default function NewComplaintPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit Complaint</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your complaint will be reviewed by admin.</p>
      </div>

      <form action={submitComplaint} className="space-y-4 border border-gray-200 rounded-2xl p-6 bg-white">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
          <select
            name="category"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          >
            {CATEGORIES.map((c) => (
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

        <div className="flex gap-3 pt-1">
          <SubmitButton
            pendingText="Submitting..."
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Submit Complaint
          </SubmitButton>
          <a href="/complaints" className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2.5">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
