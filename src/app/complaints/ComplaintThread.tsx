"use client";
import { useRef, useTransition } from "react";
import { addComplaintMessage } from "@/lib/actions";

type Msg = {
  id: number;
  message: string;
  createdAt: Date;
  user: { displayName: string | null; username: string; isAdmin: boolean };
};

export default function ComplaintThread({
  complaintId,
  messages,
  meIsAdmin,
}: {
  complaintId: number;
  messages: Msg[];
  meIsAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const msg = String(fd.get("message") ?? "").trim();
    if (!msg) return;
    start(async () => {
      await addComplaintMessage(complaintId, fd);
      formRef.current?.reset();
    });
  }

  return (
    <div className="px-6 py-5 space-y-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Conversation ({messages.length})
      </p>

      {/* messages */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((m) => {
            const isAdmin = m.user.isAdmin;
            return (
              <div key={m.id} className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}>
                {/* avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isAdmin ? "bg-black text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {(m.user.displayName ?? m.user.username).charAt(0).toUpperCase()}
                </div>
                {/* bubble */}
                <div className={`max-w-[80%] ${isAdmin ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isAdmin
                      ? "bg-black text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}>
                    {m.message}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">
                    {m.user.displayName ?? m.user.username} ·{" "}
                    {m.createdAt.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* reply box */}
      <form ref={formRef} onSubmit={submit} className="flex gap-2 pt-1">
        <input
          name="message"
          type="text"
          required
          placeholder={meIsAdmin ? "Reply to employee..." : "Reply to admin..."}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors shrink-0"
        >
          {pending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
