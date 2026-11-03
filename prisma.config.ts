import "dotenv/config";
import { defineConfig } from "prisma/config";

// The app keeps all its tables in the "saas" Postgres schema, apart from
// anything else in the same database. Migrations run against that schema.
const DB_SCHEMA = "saas";

function withSchema(url: string | undefined) {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set("schema", DB_SCHEMA);
  return u.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: withSchema(process.env["DATABASE_URL"]),
  },
});
