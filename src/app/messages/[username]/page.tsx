import { prisma } from "@/lib/prisma";
import { getSessionUsername } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { sendMessage, markMessagesRead } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const me = await getSessionUsername();
  if (!me) redirect("/login");

  const { username: otherUsername } = await params;

  const [otherUser, messages] = await Promise.all([
    prisma.user.findUnique({
      where: { username: otherUsername },
      select: { username: true, displayName: true },
    }),
    prisma.message.findMany({
      where: {
        OR: [
          { fromUsername: me, toUsername: otherUsername },
          { fromUsername: otherUsername, toUsername: me },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!otherUser) redirect("/messages");

  // Mark incoming messages as read (server-side side effect)
  await markMessagesRead(otherUsername);

  const sendBound = sendMessage;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 shrink-0">
        <Link href="/messages" className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1 rounded-lg hover:bg-gray-100">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
            <path d="M13 16l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-medium">
            {(otherUser.displayName ?? otherUser.username).charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{otherUser.displayName ?? otherUser.username}</p>
          <p className="text-xs text-gray-400">@{otherUser.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.fromUsername === me;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "bg-zinc-900 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-white/50" : "text-gray-400"}`}>
                    {msg.createdAt.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                    {" · "}
                    {msg.createdAt.toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compose */}
      <div className="shrink-0 pt-3 border-t border-gray-100">
        <form action={sendBound} className="flex gap-2 items-end">
          <input type="hidden" name="toUsername" value={otherUsername} />
          <textarea
            name="body"
            required
            rows={1}
            placeholder={`Message ${otherUser.displayName ?? otherUser.username}…`}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black resize-none transition-colors"
            style={{ minHeight: "42px", maxHeight: "120px" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <SubmitButton className="shrink-0 bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors">
            Send
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
