"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logWhatsappReply } from "@/lib/actions";

export default function LogWhatsappButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleLog() {
    startTransition(async () => {
      await logWhatsappReply();
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleLog}
      disabled={pending}
      className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8.9-.2.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.2-.2 0-.4.1-.5l.4-.4c.1-.1.2-.2.2-.4s0-.3-.1-.4c-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3Z"/></svg>
      Log WhatsApp Reply
    </button>
  );
}
