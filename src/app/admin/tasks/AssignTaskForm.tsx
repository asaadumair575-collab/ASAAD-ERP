"use client";

import { useState, useTransition } from "react";
import { assignTask } from "@/lib/actions";
import { useRouter } from "next/navigation";

const UNIT_OPTIONS = ["calls", "leads", "orders", "follow-ups", "dispatches", "entries"];

export default function AssignTaskForm({
  employees,
  defaultDate,
}: {
  employees: { id: number; displayName: string | null; username: string }[];
  defaultDate: string;
}) {
  const [assignedToId, setAssignedToId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("calls");
  const [customUnit, setCustomUnit] = useState("");
  const [metric, setMetric] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const effectiveUnit = unit === "__custom__" ? customUnit.trim() : unit;
  const canSave = assignedToId && title.trim() && targetValue && parseInt(targetValue) > 0 && effectiveUnit;

  function save() {
    if (!canSave) return;
    startTransition(async () => {
      await assignTask({
        assignedToId: parseInt(assignedToId),
        title: title.trim(),
        description: description.trim() || undefined,
        targetValue: parseInt(targetValue),
        unit: effectiveUnit,
        metric: metric || undefined,
        date,
      });
      setTitle("");
      setDescription("");
      setTargetValue("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-800">New Task</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Employee <span className="text-red-400">*</span></label>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Select employee...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.displayName ?? e.username}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Task Title <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Make reorder calls"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional instructions..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Target <span className="text-red-400">*</span></label>
          <input
            type="number"
            min={1}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g. 50"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Unit <span className="text-red-400">*</span></label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            <option value="__custom__">Custom...</option>
          </select>
        </div>

        {unit === "__custom__" && (
          <div className="col-span-2">
            <input
              type="text"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="Enter unit name..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        )}

        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Auto-track from</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Manual (employee updates themselves)</option>
            <option value="REORDER_CALLS">Reorder Calls — count today&apos;s reorder lead calls</option>
            <option value="RETAIL_FOLLOWUP">B2B Leads Called — count today&apos;s retail shop follow-up calls</option>
            <option value="RETAIL_ORDERS">Retail Orders — count today&apos;s orders booked</option>
          </select>
          {metric && (
            <p className="text-xs text-green-600 mt-1">✓ Progress will update automatically from system data</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {success && <p className="text-xs text-green-600 font-medium">✓ Task assigned!</p>}
        <div className="ml-auto">
          <button
            onClick={save}
            disabled={!canSave || pending}
            className="bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {pending ? "Assigning..." : "Assign Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
