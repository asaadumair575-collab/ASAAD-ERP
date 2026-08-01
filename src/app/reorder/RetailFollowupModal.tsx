"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRetailFollowupBatch, getRetailFollowupCount } from "@/lib/actions";

export default function RetailFollowupModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openModal() {
    const today = new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
    setName(`Retail Follow-up — ${today}`);
    setCount(null);
    setOpen(true);
    startTransition(async () => {
      const n = await getRetailFollowupCount();
      setCount(n);
    });
  }

  function close() {
    setOpen(false);
    setName("");
    setCount(null);
  }

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const id = await createRetailFollowupBatch(name.trim());
      close();
      router.push(`/reorder/${id}`);
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        className="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
      >
        🔄 Retail Follow-up
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={close}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-semibold text-gray-800">Retail Follow-up Batch</h2>
              <p className="text-xs text-gray-400 mt-1">
                Retail advance customers jinka order 15+ din pehle aya — unhe call kar ke poochho order chahiye?
              </p>
            </div>

            {/* Customer count */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              {count === null ? (
                <p className="text-sm text-blue-400">Customers dhundh rahe hain...</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-blue-700">{count}</p>
                  <p className="text-xs text-blue-500 mt-1">customers qualify karte hain (15+ din pehle order)</p>
                </>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Batch ka naam</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={close} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={pending || !name.trim() || count === 0}
                className="bg-black text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {pending ? "Bana rahe hain..." : `Batch Banao${count !== null ? ` (${count})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
