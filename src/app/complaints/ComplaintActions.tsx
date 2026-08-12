"use client";
import { useState, useTransition } from "react";
import { resolveComplaint } from "@/lib/actions";

export default function ComplaintActions({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("RESOLVED");
  const [pending, start] = useTransition();

  function submit() {
    const fd = new FormData();
    fd.set("status", status);
    fd.set("adminNote", note);
    start(async () => {
      await resolveComplaint(id, fd);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
      >
        Respond
      </button>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t border-gray-100">
      <div className="flex gap-2">
        {[
          { val: "RESOLVED", label: "✓ Resolved" },
          { val: "IN_PROGRESS", label: "🔄 In Progress" },
          { val: "DISMISSED", label: "✕ Dismiss" },
        ].map((s) => (
          <button
            key={s.val}
            onClick={() => setStatus(s.val)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              status === s.val
                ? "bg-black text-white border-black"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Response to employee (optional)..."
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="text-xs font-medium bg-black text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
