import SubmitButton from "@/components/SubmitButton";

export type AccessPage = { key: string; label: string };

// One collapsible-feeling block per module (Wholesale, Retail COD, Leads,
// ...) — same shape every time, so adding the next module is just another
// one of these with its own page list and its own bound save action.
export default function ModuleAccessCard({
  title,
  description,
  pages,
  initial,
  action,
}: {
  title: string;
  description: string;
  pages: AccessPage[];
  initial: Record<string, boolean>;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pages.map((p) => (
          <label
            key={p.key}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 has-checked:border-black has-checked:bg-black has-checked:text-white cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              name={p.key}
              value="1"
              defaultChecked={initial[p.key]}
              className="w-3.5 h-3.5 accent-black rounded"
            />
            <span className="text-sm font-medium">{p.label}</span>
          </label>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
        <SubmitButton
          pendingText="Saving..."
          className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Save Access
        </SubmitButton>
      </div>
    </form>
  );
}
