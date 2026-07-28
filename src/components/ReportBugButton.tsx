"use client";

import { useRef, useState, useTransition } from "react";
import { reportBug } from "@/lib/actions";
import { usePathname } from "next/navigation";

export default function ReportBugButton() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("page", pathname);
    startTransition(async () => {
      await reportBug(fd);
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); formRef.current?.reset(); }, 1800);
    });
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        title="Report a bug"
        className="fixed bottom-5 right-5 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Report a Bug</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-sm font-medium text-gray-700">Bug reported! Admin will review it.</p>
              </div>
            ) : (
              <form ref={formRef} onSubmit={submit} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Short title *</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Order total showing wrong"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Describe the problem *</label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    placeholder="What happened? What did you expect to happen?"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
                <p className="text-xs text-gray-400">Page: <span className="font-mono">{pathname}</span></p>
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                >
                  {pending ? "Submitting..." : "Submit Report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
