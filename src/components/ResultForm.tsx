"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { Result } from "@/app/app/actions";

type Action = (state: Result | undefined, form: FormData) => Promise<Result>;

// A form backed by a server action that returns { ok, message }. Submits via
// onSubmit (not the form action prop) so React doesn't clear what was typed
// when the action reports an error; the form is cleared only on success.
export default function ResultForm({ action, submitLabel, pendingLabel, children, className = "space-y-3" }: {
  action: Action; submitLabel: string; pendingLabel?: string; children: ReactNode; className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="h-9 px-4 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-60">
          {pending ? pendingLabel ?? "Saving…" : submitLabel}
        </button>
        {state && <span className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
