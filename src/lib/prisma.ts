import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "fs";
import path from "path";

function resolveDatabaseUrl(): string {
  if (process.env.VERCEL) {
    // Vercel's deployment bundle is read-only, so copy the empty seed
    // database into /tmp (writable, but ephemeral per instance) on cold start.
    const dest = "/tmp/dev.db";
    if (!fs.existsSync(dest)) {
      const seed = path.join(process.cwd(), "prisma", "seed.db");
      fs.copyFileSync(seed, dest);
    }
    return `file:${dest}`;
  }

  return process.env.DATABASE_URL ?? "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
