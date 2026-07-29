"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { sendMessage } from "@/lib/actions";

type UserMin = { id: number; displayName: string | null; username: string };
type Conv = { user: UserMin; lastMsg: { body: string; createdAt: string } | null; unread: number };
type Msg = { id: number; senderId: number; body: string; createdAt: string; readAt: string | null };

function name(u: UserMin) { return u.displayName ?? u.username; }
function initial(u: UserMin) { return name(u).charAt(0).toUpperCase(); }
function timeStr(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

export default function MessagesUI({
  me,
  users,
  conversations,
  activeChatId,
  activeMessages,
}: {
  me: UserMin;
  users: UserMin[];
  conversations: Conv[];
  activeChatId: number | null;
  activeMessages: Msg[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [newChat, setNewChat] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeUser = activeChatId ? [...users, me].find((u) => u.id === activeChatId) ?? null : null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChatId || !text.trim() || pending) return;
    const body = text.trim();
    setText("");
    setError("");
    try {
      await sendMessage(activeChatId, body);
      router.replace(`/messages?with=${activeChatId}`);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    } catch (err) {
      setText(body);
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
  }

  // Group messages by date
  const grouped: { date: string; msgs: Msg[] }[] = [];
  for (const m of activeMessages) {
    const label = dateLabel(m.createdAt);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== label) grouped.push({ date: label, msgs: [m] });
    else last.msgs.push(m);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Messages</h2>
          <button
            onClick={() => setNewChat(true)}
            title="New message"
            className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-8 px-4">No conversations yet. Start one!</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.user.id}
              onClick={() => router.push(`/messages?with=${c.user.id}`)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${activeChatId === c.user.id ? "bg-gray-50" : ""}`}
            >
              <span className="w-9 h-9 rounded-full bg-zinc-800 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                {initial(c.user)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800 truncate">{name(c.user)}</p>
                  {c.lastMsg && (
                    <p className="text-xs text-gray-400 shrink-0 ml-1">{dateLabel(c.lastMsg.createdAt)}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMsg?.body ?? "No messages yet"}</p>
              </div>
              {c.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChatId && activeUser ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-zinc-800 text-white text-sm font-semibold flex items-center justify-center">
                {initial(activeUser)}
              </span>
              <p className="text-sm font-semibold text-gray-800">{name(activeUser)}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {activeMessages.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-8">Say hello to {name(activeUser)}!</p>
              )}
              {grouped.map((g) => (
                <div key={g.date}>
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <p className="text-xs text-gray-400">{g.date}</p>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="space-y-2">
                    {g.msgs.map((m) => {
                      const isMine = m.senderId === me.id;
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                            isMine
                              ? "bg-black text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}>
                            <p>{m.body}</p>
                            <p className={`text-xs mt-1 ${isMine ? "text-gray-400" : "text-gray-400"} text-right`}>
                              {timeStr(m.createdAt)}
                              {isMine && m.readAt && " ✓✓"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {error && (
              <p className="px-5 py-1.5 text-xs text-red-500 bg-red-50 border-t border-red-100">{error}</p>
            )}
            <form onSubmit={send} className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${name(activeUser)}...`}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as never); } }}
              />
              <button
                type="submit"
                disabled={pending || !text.trim()}
                className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 transition-colors shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-sm font-medium text-gray-500">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New chat modal */}
      {newChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setNewChat(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800">New Message</h3>
            <p className="text-xs text-gray-400">Select a user to chat with</p>
            <div className="space-y-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setNewChat(false); router.push(`/messages?with=${u.id}`); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-zinc-800 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                    {initial(u)}
                  </span>
                  <p className="text-sm font-medium text-gray-800">{name(u)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
