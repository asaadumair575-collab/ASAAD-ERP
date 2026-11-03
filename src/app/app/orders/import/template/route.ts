import { requireUser } from "@/lib/auth";
import { IMPORT_COLUMNS, csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  await requireUser();
  return csvResponse("orders-import-template.csv", toCsv(IMPORT_COLUMNS.map((c) => c.key), [IMPORT_COLUMNS.map((c) => c.example)]));
}
