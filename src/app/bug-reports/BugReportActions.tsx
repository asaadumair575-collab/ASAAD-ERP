"use client";

import { useState, useTransition } from "react";
import { updateBugReportStatus } from "@/lib/actions";

export default function BugReportActions({
  id,
  status,
  adminNote,
}: {
  id: number;
  status: string;
  adminNote: string;
}) {
  const [note, setNote] = useState(adminNote);
  const [pending, startTransition] = useTransition();

  function update(newStatus: string) {
    startTransition(() => updateBugReportStatus(id, newStatus, note));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-black bg-gray-50"
      />
      {status === "OPEN" && (
        <>
          <button
            onClick={() => update("IN_PROGRESS")}
            disabled={pending}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50 transition-colors"
          >
            In Progress
          </button>
          <button
            onClick={() => update("RESOLVED")}
            disabled={pending}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors"
          >
            Resolve
          </button>
        </>
      )}
      {status === "IN_PROGRESS" && (
        <button
          onClick={() => update("RESOLVED")}
          disabled={pending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors"
        >
          Mark Resolved
        </button>
      )}
      {status === "RESOLVED" && (
        <button
          onClick={() => update("OPEN")}
          disabled={pending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Reopen
        </button>
      )}
      {note !== adminNote && (
        <button
          onClick={() => update(status)}
          disabled={pending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Save Note
        </button>
      )}
    </div>
  );
}
