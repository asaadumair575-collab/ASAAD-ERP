import { prisma } from "@/lib/prisma";
import { getSessionUsername } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MessagesPage() {
  const me = await getSessionUsername();
  if (!me) redirect("/login");

  const [allUsers, recentMessages] = await Promise.all([
    prisma.user.findMany({
      where: { username: { not: me } },
      select: { username: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.message.findMany({
      where: { OR: [{ fromUsername: me }, { toUsername: me }] },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build conversation list: one entry per other user, sorted by latest message
  const convMap = new Map<string, { lastMsg: (typeof recentMessages)[0]; unread: number }>();
  for (const msg of recentMessages) {
    const other = msg.fromUsername === me ? msg.toUsername : msg.fromUsername;
    if (!convMap.has(other)) {
      convMap.set(other, { lastMsg: msg, unread: 0 });
    }
    if (msg.toUsername === me && !msg.readAt) {
      convMap.get(other)!.unread++;
    }
  }

  // Merge with all users so you can start new conversations too
  const conversations = allUsers.map((u) => ({
    username: u.username,
    displayName: u.displayName,
    ...(convMap.get(u.username) ?? { lastMsg: null, unread: 0 }),
  })).sort((a, b) => {
    const ta = a.lastMsg?.createdAt.getTime() ?? 0;
    const tb = b.lastMsg?.createdAt.getTime() ?? 0;
    return tb - ta;
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}` : "All caught up"}
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No users to message yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {conversations.map((c) => (
            <Link
              key={c.username}
              href={`/messages/${c.username}`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-medium">
                  {(c.displayName ?? c.username).charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {c.displayName ?? c.username}
                  </p>
                  {c.lastMsg && (
                    <p className="text-xs text-gray-400 shrink-0">
                      {c.lastMsg.createdAt.toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {c.lastMsg
                    ? (c.lastMsg.fromUsername === me ? "You: " : "") + c.lastMsg.body
                    : "No messages yet"}
                </p>
              </div>

              {c.unread > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 bg-zinc-900 text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1.5">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
