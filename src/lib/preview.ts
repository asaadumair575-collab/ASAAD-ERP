import { hashPassword, randomPassword } from "./crypto";
import { db } from "./db";
import { loadSampleData } from "./sample";

// OPEN PREVIEW: while true, the site opens without signing in — /app shows a
// sample "Preview Store" and /admin opens directly. Meant for showing the
// software before handing out logins. Set to false (or set REQUIRE_LOGIN=1 on
// the server) to require sign-in again.
export const OPEN_PREVIEW = process.env.REQUIRE_LOGIN !== "1" && true;

const PREVIEW_EMAIL = "preview@store.local";

// The virtual admin used while the preview is open (no database row, so the
// real first-run admin setup still works later).
export const PREVIEW_ADMIN = { id: 0, email: "Preview mode", name: "Preview", passwordHash: "", createdAt: new Date(0) };

let creating: Promise<void> | null = null;

// The sample store everyone lands in during the preview; created on first visit.
export async function previewUser() {
  const find = () => db.user.findUnique({ where: { email: PREVIEW_EMAIL }, include: { tenant: true } });
  let user = await find();
  if (!user) {
    creating ??= (async () => {
      try {
        const tenant = await db.tenant.create({
          data: {
            name: "Preview Store",
            isDemo: true,
            notes: "Open preview store (no login)",
            users: { create: { name: "Preview", email: PREVIEW_EMAIL, passwordHash: hashPassword(randomPassword(24)), role: "OWNER" } },
          },
        });
        await loadSampleData(tenant.id);
      } catch {
        // Another request created it at the same moment — fine.
      } finally {
        creating = null;
      }
    })();
    await creating;
    user = await find();
  }
  if (user && (user.tenant.status !== "ACTIVE" || user.tenant.expiresAt)) {
    // Keep the preview store always open even if someone ends or pauses it in /admin.
    await db.tenant.update({ where: { id: user.tenantId }, data: { status: "ACTIVE", expiresAt: null } });
    user = await find();
  }
  return user;
}
