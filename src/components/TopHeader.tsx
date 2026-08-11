"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useTransition } from "react";
import { logoutAction } from "@/lib/actions";
import Link from "next/link";
import NotificationToggle from "@/components/NotificationToggle";

export default function TopHeader({
  onMenuClick,
  username,
  unreadCount = 0,
}: {
  onMenuClick: () => void;
  username: string | null;
  unreadCount?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
    }
    if (userOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/clients?q=${encodeURIComponent(query.trim())}`);
  }

  const initial = (username ?? "U").charAt(0).toUpperCase();

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur-md print:hidden">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors -ml-1"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-sm">
        <div className="relative">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none">
            <path d="M8.5 15A6.5 6.5 0 1 0 8.5 2a6.5 6.5 0 0 0 0 13ZM18 18l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients..."
            className="w-full h-9 pl-9 pr-3 bg-gray-100 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:bg-white transition-colors"
          />
        </div>
      </form>

      <div className="flex items-center gap-1 ml-auto">
        <NotificationToggle />
        {/* Messages bell */}
        <Link href="/messages" className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
            <path d="M10 2a6 6 0 0 0-6 6v2.5l-1.5 2.5h15L16 10.5V8a6 6 0 0 0-6-6ZM8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initial}
            </span>
            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
              {username ?? "User"}
            </span>
            <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-gray-400 hidden sm:block">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
            </svg>
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-900 truncate">{username}</p>
                <p className="text-xs text-gray-400 mt-0.5">Logged in</p>
              </div>
              <Link
                href="/messages"
                onClick={() => setUserOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                  <path d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4l-2 2V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Messages
                {unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => startTransition(() => logoutAction())}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                  <path d="M7.5 17.5h-3a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1h3M13 14l4-4-4-4M17 10H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
