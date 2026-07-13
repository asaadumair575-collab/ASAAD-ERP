"use client";

import { useRef, useState, useTransition } from "react";

export default function SampleResponseInline({
  sampleId,
  initialResponse,
  action,
}: {
  sampleId: number;
  initialResponse: string | null;
  action: (sampleId: number, formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialResponse ?? "");
  const [saved, setSaved] = useState(initialResponse ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancel() {
    setValue(saved);
    setEditing(false);
  }

  function save() {
    const fd = new FormData();
    fd.set("response", value);
    startTransition(async () => {
      await action(sampleId, fd);
      setSaved(value);
      setEditing(false);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") cancel();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
  }

  if (editing) {
    return (
      <div className="space-y-1.5 min-w-[200px]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="Write the customer's response…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="text-xs text-gray-500 px-2 py-1.5 hover:text-black transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="text-left group w-full"
    >
      {saved ? (
        <span className="text-sm text-gray-700 group-hover:text-black transition-colors">
          {saved}
        </span>
      ) : (
        <span className="text-xs text-gray-300 group-hover:text-gray-400 transition-colors italic">
          + Add response
        </span>
      )}
    </button>
  );
}
