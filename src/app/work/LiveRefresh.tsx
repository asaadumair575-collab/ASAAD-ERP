"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Order Confirmation's numbers come straight from the orders table, so a
// silent periodic refresh is what makes "new order arrived → task updates"
// feel live without wiring up a websocket for one counter.
export default function LiveRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
