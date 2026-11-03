"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { importOrders, type ImportResult } from "@/app/app/actions";
import { btn } from "./ui";

export default function ImportForm() {
  const [state, action, pending] = useActionState<ImportResult | undefined, FormData>(importOrders, undefined);
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-4"
    >
      <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-950 bg-gray-50/50 px-6 py-10 cursor-pointer text-center">
        <FileUp className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
        <span className="text-sm font-medium text-gray-900">{name || "Choose your CSV file"}</span>
        <span className="text-xs text-gray-500">Save from Excel or Google Sheets as “CSV (comma separated)”. Max 2,000 rows.</span>
        <input type="file" name="file" accept=".csv,text/csv" required className="sr-only" onChange={(e) => setName(e.target.files?.[0]?.name ?? "")} />
      </label>
      <button type="submit" disabled={pending} className={btn("primary")}>{pending ? "Importing…" : "Import orders"}</button>
      {state && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          <p className="font-medium">{state.message}</p>
          {state.ok && <Link href="/app/orders?status=CONFIRMED" className="underline">Go to confirmed orders →</Link>}
          {!!state.errors?.length && <ul className="mt-2 list-disc pl-5 space-y-0.5 text-xs">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}
    </form>
  );
}
