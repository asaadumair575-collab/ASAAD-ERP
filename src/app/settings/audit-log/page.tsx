import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";

const PAGE_SIZE = 50;
const ACTIONS = ["LOGIN", "LOGIN_FAILED", "LOGOUT", "CREATE", "UPDATE", "DELETE"] as const;

const ACTION_STYLES: Record<string, string> = {
  LOGIN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOGIN_FAILED: "bg-red-50 text-red-700 border-red-200",
  LOGOUT: "bg-gray-50 text-gray-600 border-gray-200",
  CREATE: "bg-blue-50 text-blue-700 border-blue-200",
  UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  LOGIN_FAILED: "Login failed",
  LOGOUT: "Logout",
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// changes comes in one of three shapes depending on what produced it:
//  - field diff on UPDATE:      { field: { from, to }, ... }
//  - CREATE / DELETE snapshot:  { after: {...} } / { before: {...} }
//  - bulk updateMany/deleteMany: { where: {...}, data?: {...} }
function ChangesDetail({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== "object") return null;
  const c = changes as Record<string, unknown>;
  const isFieldDiff = !("after" in c) && !("before" in c) && !("where" in c);

  if (isFieldDiff) {
    const entries = Object.entries(c) as [string, { from: unknown; to: unknown }][];
    if (entries.length === 0) return null;
    return (
      <ul className="text-xs text-gray-600 space-y-1">
        {entries.map(([field, v]) => (
          <li key={field}>
            <span className="font-medium text-gray-700">{field}</span>:{" "}
            <span className="text-red-500 line-through">{fmtVal(v?.from)}</span>{" "}
            <span className="text-gray-400">→</span>{" "}
            <span className="text-emerald-600 font-medium">{fmtVal(v?.to)}</span>
          </li>
        ))}
      </ul>
    );
  }

  const json = JSON.stringify(c, null, 2);
  const capped = json.length > 3000 ? json.slice(0, 3000) + "\n… (truncated)" : json;
  return (
    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all bg-gray-50 rounded-lg p-3 max-h-64 overflow-auto">
      {capped}
    </pre>
  );
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; userId?: string; model?: string; action?: string; page?: string }>;
}) {
  const { from, to, userId, model, action, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00+05:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59+05:00`) } : {}),
    };
  }
  if (userId) where.userId = Number(userId);
  if (model) where.model = model;
  if (action) where.action = action;

  const [totalCount, logs, users, modelRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.findMany({ select: { id: true, username: true, displayName: true }, orderBy: { username: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["model"], select: { model: true }, orderBy: { model: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(from || to || userId || model || action);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every login and every create/update/delete across the app — {totalCount} event{totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/settings" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
          ← Settings
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap gap-2 items-end bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" name="from" defaultValue={from ?? ""} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" name="to" defaultValue={to ?? ""} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">User</label>
          <select name="userId" defaultValue={userId ?? ""} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black">
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.displayName ?? u.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Table</label>
          <select name="model" defaultValue={model ?? ""} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black">
            <option value="">All tables</option>
            {modelRows.map((m) => (
              <option key={m.model} value={m.model}>{m.model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Action</label>
          <select name="action" defaultValue={action ?? ""} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black">
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Filter
        </button>
        {hasFilters && (
          <Link href="/settings/audit-log" className="text-sm text-gray-400 hover:text-black px-2 py-2">Clear</Link>
        )}
      </form>

      {logs.length === 0 ? (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-sm">No activity found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="py-3 px-5">When</th>
                <th className="py-3 px-5">Who</th>
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-5">What</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((l) => (
                <tr key={l.id} className="align-top hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-5 text-gray-500 text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                  <td className="py-3 px-5 text-gray-700">
                    {l.userName ?? <span className="text-gray-400">System</span>}
                    {l.ip && <span className="block text-gray-300 text-xs">{l.ip}</span>}
                  </td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${ACTION_STYLES[l.action] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {ACTION_LABELS[l.action] ?? l.action}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <p className="font-medium text-gray-800">{l.summary ?? l.model}</p>
                    {l.changes != null && (
                      <details className="mt-1.5">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 w-fit">View details</summary>
                        <div className="mt-1.5">
                          <ChangesDetail changes={l.changes} />
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={{ pathname: "/settings/audit-log", query: { from, to, userId, model, action, page: currentPage - 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={{ pathname: "/settings/audit-log", query: { from, to, userId, model, action, page: currentPage + 1 } }}
                className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next 50 →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
