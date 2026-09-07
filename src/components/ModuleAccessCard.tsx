import SubmitButton from "@/components/SubmitButton";

export type AccessPage = { key: string; label: string; group?: string };

function CheckboxGrid({ pages, initial }: { pages: AccessPage[]; initial: Record<string, boolean> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
  );
}

// One collapsible-feeling block per module (Wholesale, Retail COD, Leads,
// ...) — same shape every time, so adding the next module is just another
// one of these with its own page list and its own bound save action. Pages
// with a `group` render clustered under a sub-heading, mirroring the
// sidebar's own nested sections (e.g. Analytics, Orders); ungrouped pages
// sit in the plain top-level grid.
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
  const ungrouped = pages.filter((p) => !p.group);
  const groups = Array.from(new Set(pages.filter((p) => p.group).map((p) => p.group!)));

  return (
    <form action={action} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="p-5 space-y-4">
        {ungrouped.length > 0 && <CheckboxGrid pages={ungrouped} initial={initial} />}
        {groups.map((group) => (
          <div key={group} className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide pl-0.5">{group}</p>
            <CheckboxGrid pages={pages.filter((p) => p.group === group)} initial={initial} />
          </div>
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
