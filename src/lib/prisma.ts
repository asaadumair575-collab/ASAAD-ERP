import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCurrentActor } from "@/lib/auditContext";

// ── Audit log query extension ────────────────────────────────────────────
// Every create/update/delete across the app lands in AuditLog automatically,
// tagged with whoever lib/auth.ts's getSessionUser() last identified as the
// current actor (see lib/auditContext.ts). This is deliberately generic —
// new models get audited for free, nobody has to remember to add logging
// calls to a new server action.

// Log-like or high-frequency/ephemeral tables: auditing their writes would
// either double-log an existing log, or flood AuditLog with noise nobody
// reviews (page-view tracking, push subscription housekeeping).
const AUDIT_EXCLUDED_MODELS = new Set([
  "AuditLog",
  "WebsiteVisit",
  "PushSubscription",
  "EcomOrderStatusLog",
  "CampaignAuditLog",
  "ReorderCallLog",
  "ReorderCallAttempt",
  "ReorderCallAbort",
  "PhoneCallLog",
  "WhatsappReplyLog",
]);

// Never store these, even redacted-in-place — secrets and large binary/base64
// blobs don't belong in a table admins browse.
const REDACTED_FIELDS = new Set([
  "passwordHash",
  "apiToken",
  "fcmToken",
  "label",
  "photo",
  "screenshot",
  "snapshot",
]);

type Row = Record<string, unknown>;

// AppSetting is a generic key/value table (it holds things like the PostEx
// API key) — redact its value when the key name looks like a secret,
// rather than trying to name every possible key up front.
const SECRET_KEY_PATTERN = /key|token|secret|password/i;

function isSecretSetting(model: string, obj: Row): boolean {
  return model === "AppSetting" && typeof obj.key === "string" && SECRET_KEY_PATTERN.test(obj.key);
}

function redact(model: string, obj: Row | null | undefined): Row | null {
  if (!obj) return null;
  const out: Row = {};
  const settingIsSecret = isSecretSetting(model, obj);
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACTED_FIELDS.has(k) || (settingIsSecret && k === "value") ? "[redacted]" : v;
  }
  return out;
}

function normalize(v: unknown): unknown {
  return v instanceof Date ? v.toISOString() : v;
}

function diffRows(model: string, before: Row | null, after: Row | null): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (!before || !after) return changes;
  const settingIsSecret = isSecretSetting(model, after) || isSecretSetting(model, before);
  for (const key of Object.keys(after)) {
    if (REDACTED_FIELDS.has(key)) continue;
    const a = normalize(before[key]);
    const b = normalize(after[key]);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    changes[key] = settingIsSecret && key === "value" ? { from: "[redacted]", to: "[redacted]" } : { from: a, to: b };
  }
  return changes;
}

// Plain-English names for what admins actually call these things, used in
// place of the raw Prisma model name in audit summaries.
const MODEL_LABELS: Record<string, string> = {
  RetailOrder: "retail advance order",
  RetailCustomer: "retail customer",
  EcomOrder: "retail COD order",
  DraftOrder: "draft order",
  Lead: "B2B lead",
  Sample: "sample",
  Client: "wholesale client",
  Order: "wholesale order",
  User: "user",
  EcomExpense: "ecommerce expense",
  Complaint: "complaint",
  DispatchSheet: "dispatch sheet",
  ReorderLead: "reorder lead",
  ReorderCampaign: "reorder campaign",
  EmployeeTask: "task",
  TaskTemplate: "recurring task",
  EmpCommissionEntry: "commission entry",
  EmpWithdrawal: "withdrawal",
}

function modelLabel(model: string): string {
  return MODEL_LABELS[model] ?? model.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function rowName(row: Row): string | undefined {
  return (row.customerName ?? row.name ?? row.displayName ?? row.username ?? row.shopNumber ?? row.title) as
    | string
    | undefined;
}

// Recognizes a handful of common "this update actually means something
// specific" transitions (an order getting confirmed, dispatched, etc.) so
// the audit log reads like "Confirmed retail COD order — Ahmed" instead of
// a generic "Updated retail COD order" for every single field edit.
function describeTransition(model: string, before: Row, after: Row): string | null {
  if ((model === "EcomOrder" || model === "DraftOrder") && !before.confirmed && after.confirmed) return "Confirmed";
  if (model === "EcomOrder" && before.draftStatus !== "CONFIRMED" && after.draftStatus === "CONFIRMED") return "Confirmed";
  if (model === "EcomOrder" && !before.dispatchedAt && after.dispatchedAt) return "Dispatched";
  if (model === "EcomOrder" && !before.packedAt && after.packedAt) return "Packed";
  if (model === "EcomOrder" && !before.returned && after.returned) return "Marked returned";
  if (model === "RetailOrder" && !before.dispatched && after.dispatched) return "Dispatched";
  if (model === "Lead" && before.status !== "CONTACTED" && after.status === "CONTACTED") return "Contacted";
  if (model === "Lead" && before.status !== "CONFIRMED" && after.status === "CONFIRMED") return "Confirmed";
  if (model === "Complaint" && before.status !== "RESOLVED" && after.status === "RESOLVED") return "Resolved";
  return null;
}

function summarize(model: string, row: Row | null, action: "CREATE" | "UPDATE" | "DELETE" = "CREATE", before: Row | null = null): string {
  if (!row) return model;
  const label = modelLabel(model);
  const name = rowName(row);
  const suffix = name ? ` — ${name}` : ` #${row.id ?? ""}`;

  if (action === "UPDATE" && before) {
    const transition = describeTransition(model, before, row);
    if (transition) return `${transition} ${label}${suffix}`;
    return `Updated ${label}${suffix}`;
  }
  if (action === "DELETE") return `Deleted ${label}${suffix}`;
  return `Created ${label}${suffix}`;
}

function toDelegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const base = new PrismaClient({ adapter });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || AUDIT_EXCLUDED_MODELS.has(model)) return query(args);

          async function logEntry(entry: {
            action: string;
            recordId: string | null;
            summary: string;
            changes: unknown;
          }) {
            const actor = getCurrentActor();
            try {
              await base.auditLog.create({
                data: {
                  userId: actor.userId,
                  userName: actor.userName,
                  ip: actor.ip,
                  action: entry.action,
                  model,
                  recordId: entry.recordId,
                  summary: entry.summary,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  changes: entry.changes as any,
                },
              });
            } catch {
              // Audit logging must never break the real operation.
            }
          }

          if (operation === "updateMany" || operation === "deleteMany" || operation === "createMany") {
            const result = await query(args);
            const count = (result as { count?: number } | null)?.count;
            const a = args as { where?: unknown; data?: unknown };
            const verb = operation === "deleteMany" ? "delete" : operation === "createMany" ? "create" : "update";
            const bulkAction = operation === "deleteMany" ? "DELETE" : operation === "createMany" ? "CREATE" : "UPDATE";
            await logEntry({
              action: bulkAction,
              recordId: null,
              summary: `${model} — bulk ${verb}${count != null ? ` (${count} rows)` : ""}`,
              changes:
                operation === "createMany"
                  ? { count }
                  : {
                      where: redact(model, a.where as Row),
                      ...(operation === "updateMany" ? { data: redact(model, a.data as Row) } : {}),
                    },
            });
            return result;
          }

          if (operation === "create") {
            const result = await query(args);
            const row = result as Row;
            await logEntry({
              action: "CREATE",
              recordId: row?.id != null ? String(row.id) : null,
              summary: summarize(model, row, "CREATE"),
              changes: { after: redact(model, row) },
            });
            return result;
          }

          if (operation === "delete") {
            const result = await query(args);
            const row = result as Row;
            await logEntry({
              action: "DELETE",
              recordId: row?.id != null ? String(row.id) : null,
              summary: summarize(model, row, "DELETE"),
              changes: { before: redact(model, row) },
            });
            return result;
          }

          if (operation === "update" || operation === "upsert") {
            let before: Row | null = null;
            try {
              const where = (args as { where?: unknown }).where;
              const delegate = (base as unknown as Record<string, { findUnique: (a: unknown) => Promise<unknown> }>)[
                toDelegateName(model)
              ];
              if (delegate && where) before = (await delegate.findUnique({ where })) as Row | null;
            } catch {
              // Best-effort — proceed without a before-snapshot rather than fail the write.
            }

            const result = await query(args);
            const after = result as Row;

            if (!before) {
              // upsert took the insert branch
              await logEntry({
                action: "CREATE",
                recordId: after?.id != null ? String(after.id) : null,
                summary: summarize(model, after, "CREATE"),
                changes: { after: redact(model, after) },
              });
            } else {
              const changes = diffRows(model, before, after);
              if (Object.keys(changes).length > 0) {
                await logEntry({
                  action: "UPDATE",
                  recordId: after?.id != null ? String(after.id) : null,
                  summary: summarize(model, after, "UPDATE", before),
                  changes,
                });
              }
            }
            return result;
          }

          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
