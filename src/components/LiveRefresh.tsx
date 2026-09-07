"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Silently re-fetches the current page's server data on an interval, so
// pages that show live business data (new orders arriving, status changes
// from other users) update on their own instead of needing a manual reload.
// No websocket — just a periodic router.refresh(), cheap enough for a
// handful of pages and simple to reason about.
export default function LiveRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
