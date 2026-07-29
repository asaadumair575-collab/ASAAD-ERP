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

  // All users except self
  const users = await prisma.user.findMany({
    where: { id: { not: me.id } },
    select: { id: true, displayName: true, username: true },
    orderBy: { displayName: "asc" },
  });

  // All messages involving me
  const allMessages = await prisma.message.findMany({
    where: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, displayName: true, username: true } },
      receiver: { select: { id: true, displayName: true, username: true } },
    },
  });

  // Mark active chat as read server-side
  if (activeChatId) {
    await prisma.message.updateMany({
      where: { senderId: activeChatId, receiverId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // Build conversation list: one entry per other user I've talked to
  const convMap = new Map<number, { user: { id: number; displayName: string | null; username: string }; lastMsg: (typeof allMessages)[0]; unread: number }>();

  for (const m of allMessages) {
    const otherId = m.senderId === me.id ? m.receiverId : m.senderId;
    const otherUser = m.senderId === me.id ? m.receiver : m.sender;
    const existing = convMap.get(otherId);
    const unreadInc = m.receiverId === me.id && !m.readAt && m.senderId === otherId ? 1 : 0;
    if (!existing) {
      convMap.set(otherId, { user: otherUser, lastMsg: m, unread: unreadInc });
    } else {
      convMap.set(otherId, { ...existing, lastMsg: m, unread: existing.unread + unreadInc });
    }
  }

  // If active chat not in convMap yet, add placeholder
  if (activeChatId && !convMap.has(activeChatId)) {
    const u = users.find((u) => u.id === activeChatId);
    if (u) convMap.set(activeChatId, { user: u, lastMsg: null as never, unread: 0 });
  }

  const conversations = Array.from(convMap.values()).sort((a, b) =>
    (b.lastMsg?.createdAt?.getTime() ?? 0) - (a.lastMsg?.createdAt?.getTime() ?? 0)
  );

  const activeMsgs = activeChatId
    ? allMessages.filter(
        (m) =>
          (m.senderId === me.id && m.receiverId === activeChatId) ||
          (m.senderId === activeChatId && m.receiverId === me.id)
      )
    : [];

  return (
    <MessagesUI
      me={{ id: me.id, displayName: me.displayName ?? null, username: me.username }}
      users={users}
      conversations={conversations}
      activeChatId={activeChatId}
      activeMessages={activeMsgs.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      }))}
    />
  );
}
