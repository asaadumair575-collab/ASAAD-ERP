"use client";
import { useState } from "react";

function parseFeedback(note: string) {
  const m = note.match(/^\[(👍|👎)\s*(Positive|Negative):\s*(.+?)\]\s*(.*)/s);
  if (!m) return { badge: null, feedbackText: null, outcomeNote: note };
  return {
    badge: m[1] === "👍" ? "positive" : "negative",
    feedbackText: m[3].trim(),
    outcomeNote: m[4].trim(),
  };
}

export default function NoteCell({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  if (!note) return <span className="text-gray-300">—</span>;

  const { badge, feedbackText, outcomeNote } = parseFeedback(note);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-left group max-w-[180px]"
      >
        {badge && (
          <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full ${
            badge === "positive"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}>
            {badge === "positive" ? "👍" : "👎"}
          </span>
        )}
        <span className="text-xs text-gray-400 truncate group-hover:text-gray-700 transition-colors underline underline-offset-2 decoration-dashed decoration-gray-300">
          {outcomeNote || feedbackText || note}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800">Call Note</h3>

            {badge && feedbackText && (
              <div className={`rounded-xl p-3 ${badge === "positive" ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                <p className={`text-xs font-semibold mb-1 ${badge === "positive" ? "text-green-700" : "text-red-700"}`}>
                  {badge === "positive" ? "👍 Positive Feedback" : "👎 Negative Feedback"}
                </p>
                <p className="text-sm text-gray-700">{feedbackText}</p>
              </div>
            )}

            {outcomeNote && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Note</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{outcomeNote}</p>
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="w-full border border-gray-200 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
