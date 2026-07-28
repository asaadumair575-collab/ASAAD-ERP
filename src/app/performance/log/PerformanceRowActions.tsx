"use client";

import { useRef, useState, useTransition } from "react";
import { updateEmpPerformance, deleteEmpPerformanceOwn } from "@/lib/actions";

type Props = {
  id: number;
  calls: number;
  newOrders: number;
  notes: string | null;
};

export default function PerformanceRowActions({ id, calls, newOrders, notes }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      await updateEmpPerformance(id, fd);
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm("Delete this entry?")) return;
    startTransition(() => deleteEmpPerformanceOwn(id));
  }

  if (editing) {
    return (
      <>
        {/* backdrop */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800">Edit Entry</h3>
            <form ref={formRef} onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Calls</label>
                  <input
                    name="calls"
                    type="number"
                    min="0"
                    defaultValue={calls}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New Orders</label>
                  <input
                    name="newOrders"
                    type="number"
                    min="0"
                    defaultValue={newOrders}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input
                  name="notes"
                  type="text"
                  defaultValue={notes ?? ""}
                  placeholder="Optional"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 bg-black text-white text-sm font-medium py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {pending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-200 text-sm font-medium py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
      >
        Edit
      </button>
      <span className="text-gray-200">|</span>
      <button
        onClick={remove}
        disabled={pending}
        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
      >
        {pending ? "..." : "Delete"}
      </button>
    </div>
  );
}
