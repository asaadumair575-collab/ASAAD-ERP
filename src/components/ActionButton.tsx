"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Result } from "@/app/app/actions";
import { Button } from "./ui";

// Runs a server action and shows its result message next to the button.
export default function ActionButton({ action, label, pendingLabel, variant = "secondary" }: { action: () => Promise<Result>; label: string; pendingLabel?: string; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        variant={variant}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult(await action());
            router.refresh();
          })
        }
      >
        {pending ? pendingLabel ?? "Working…" : label}
      </Button>
      {result && <span className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>{result.message}</span>}
    </span>
  );
}
