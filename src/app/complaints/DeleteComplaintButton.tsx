"use client";
import { useState, useTransition } from "react";
import { deleteComplaint } from "@/lib/actions";

export default function DeleteComplaintButton({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function handleDelete() {
    start(async () => {
      try {
        await deleteComplaint(id);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "digest" in err) throw err;
      }
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Delete this complaint?</span>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          {pending ? "Deleting..." : "Yes, Delete"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  );
}
