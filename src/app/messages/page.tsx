import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import MessagesUI from "./MessagesUI";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { with: withParam } = await searchParams;
  const activeChatId = withParam ? parseInt(withParam) : null;

  try {
    const users = await prisma.user.findMany({
      where: { id: { not: me.id } },
      select: { id: true, displayName: true, username: true },
      orderBy: { displayName: "asc" },
    });

    const allMessages = await prisma.message.findMany({
      where: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        body: true,
        readAt: true,
        createdAt: true,
        sender: { select: { id: true, displayName: true, username: true } },
        receiver: { select: { id: true, displayName: true, username: true } },
      },
    });

    // Mark active conversation as read
    if (activeChatId) {
      await prisma.message.updateMany({
        where: { senderId: activeChatId, receiverId: me.id, readAt: null },
        data: { readAt: new Date() },
      });
    }

    // Build conversation summaries
    const convMap = new Map<number, {
      userId: number;
      displayName: string | null;
      username: string;
      lastBody: string;
      lastAt: string;
      unread: number;
    }>();

    for (const m of allMessages) {
      const isFromMe = m.senderId === me.id;
      const otherId = isFromMe ? m.receiverId : m.senderId;
      const other = isFromMe ? m.receiver : m.sender;
      const unreadInc = !isFromMe && !m.readAt ? 1 : 0;
      const existing = convMap.get(otherId);
      convMap.set(otherId, {
        userId: otherId,
        displayName: other.displayName,
        username: other.username,
        lastBody: m.body,
        lastAt: m.createdAt.toISOString(),
        unread: (existing?.unread ?? 0) + unreadInc,
      });
    }

    // Add placeholder for active chat if not in map
    if (activeChatId && !convMap.has(activeChatId)) {
      const u = users.find((u) => u.id === activeChatId);
      if (u) {
        convMap.set(activeChatId, {
          userId: activeChatId,
          displayName: u.displayName,
          username: u.username,
          lastBody: "",
          lastAt: "",
          unread: 0,
        });
      }
    }

    const conversations = Array.from(convMap.values()).sort((a, b) =>
      (b.lastAt || "").localeCompare(a.lastAt || "")
    );

    const activeMessages = activeChatId
      ? allMessages
          .filter(
            (m) =>
              (m.senderId === me.id && m.receiverId === activeChatId) ||
              (m.senderId === activeChatId && m.receiverId === me.id)
          )
          .map((m) => ({
            id: m.id,
            senderId: m.senderId,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            readAt: m.readAt ? m.readAt.toISOString() : null,
          }))
      : [];

    return (
      <MessagesUI
        me={{ id: me.id, displayName: me.displayName ?? null, username: me.username }}
        users={users.map((u) => ({ id: u.id, displayName: u.displayName, username: u.username }))}
        conversations={conversations}
        activeChatId={activeChatId}
        activeMessages={activeMessages}
      />
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-14 text-center shadow-sm">
        <p className="text-red-500 text-sm font-medium">Messages error</p>
        <p className="text-gray-500 text-xs mt-2 font-mono break-all max-w-lg mx-auto">{msg}</p>
      </div>
    );
  }
}
