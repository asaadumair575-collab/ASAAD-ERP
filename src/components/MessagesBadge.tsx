import { prisma } from "@/lib/prisma";
import { getSessionUsername } from "@/lib/auth";
import Link from "next/link";

export default async function MessagesBadge() {
  const me = await getSessionUsername();
  if (!me) return null;

  const unread = await prisma.message.count({
    where: { toUsername: me, readAt: null },
  });

  return (
    <Link
      href="/messages"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700 w-full"
    >
      <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
        <path d="M2.5 4.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 5.5 10 11l7.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex-1">Messages</span>
      {unread > 0 && (
        <span className="min-w-[18px] h-[18px] bg-zinc-900 text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
