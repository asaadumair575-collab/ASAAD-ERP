"use client";

import { useEffect, useRef, useState } from "react";
import SubmitButton from "@/components/SubmitButton";

type Client = { id: number; name: string; businessName: string | null };

function CustomerSearchSelect({ clients }: { clients: Client[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function label(c: Client) {
    return c.name + (c.businessName ? ` (${c.businessName})` : "");
  }

  const filtered = clients.filter((c) =>
    label(c).toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <input type="hidden" name="clientId" value={selectedId} required />
      <input
        type="text"
        placeholder="Search customer..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto border border-gray-200 rounded-lg bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No customers found</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedId(String(c.id));
                  setQuery(label(c));
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                {label(c)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function SampleForm({
  action,
  clients,
}: {
  action: (formData: FormData) => void;
  clients: Client[];
}) {
  return (
    <form
      action={action}
      className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6"
    >
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Customer<span className="text-black"> *</span>
        </label>
        <CustomerSearchSelect clients={clients} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Sample Description<span className="text-black"> *</span>
        </label>
        <textarea
          name="description"
          rows={3}
          required
          placeholder="What sample was sent? e.g. Blue fabric sample, 2 meters"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Date Sent
        </label>
        <input
          type="date"
          name="dateSent"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
        />
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton
          pendingText="Saving..."
          className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
        >
          Save Sample
        </SubmitButton>
      </div>
    </form>
  );
}
