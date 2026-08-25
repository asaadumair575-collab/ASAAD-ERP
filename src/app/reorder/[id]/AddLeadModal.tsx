"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSingleReorderLead } from "@/lib/actions";

type Campaign = { id: number; name: string };

export default function AddLeadModal({
  currentCampaignId,
  campaigns,
}: {
  currentCampaignId: number;
  campaigns: Campaign[];
}) {
  const [open, setOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(currentCampaignId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [prevItem, setPrevItem] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function openModal() {
    setCampaignId(currentCampaignId);
    setName(""); setPhone(""); setCity(""); setAddress(""); setPrevItem("");
    setError(null);
    setOpen(true);
  }

  function save() {
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required."); return; }
    setError(null);
    startTransition(async () => {
      await addSingleReorderLead(campaignId, { customerName: name, phone, city, address, prevItem });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
      >
        + Add Lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !pending && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Add Lead</h2>
              {!pending && <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Campaign</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Customer Name <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ali Hassan"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Phone <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Lahore"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Prev Item</label>
                  <input
                    type="text"
                    value={prevItem}
                    onChange={(e) => setPrevItem(e.target.value)}
                    placeholder="e.g. Shirt"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / House no."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              {!pending && (
                <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg">
                  Cancel
                </button>
              )}
              <button
                onClick={save}
                disabled={pending}
                className="bg-black text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {pending ? "Saving…" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
