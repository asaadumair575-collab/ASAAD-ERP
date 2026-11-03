// Small CSV helpers (RFC 4180 style quoting) — enough for spreadsheets
// exported from Excel / Google Sheets.

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(header: string[], rows: unknown[][]) {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export function csvResponse(name: string, body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

// The columns accepted by the order import, in template order.
export const IMPORT_COLUMNS = [
  { key: "order_number", required: false, example: "WA-101", help: "Your own reference. Left empty, one is created (I-1001, I-1002 …)." },
  { key: "customer_name", required: true, example: "Ayesha Khan", help: "Full name of the buyer." },
  { key: "phone", required: true, example: "03001234567", help: "Mobile number — 03XXXXXXXXX works best with couriers." },
  { key: "city", required: true, example: "Lahore", help: "City name as the courier spells it." },
  { key: "address", required: true, example: "House 12, Street 4, DHA Phase 5", help: "Full delivery address." },
  { key: "product", required: true, example: "Fleece Hoodie", help: "Product name. If it matches a product or SKU in Inventory, stock is linked." },
  { key: "sku", required: false, example: "HOOD-FLC-02", help: "Optional — matched against Inventory first." },
  { key: "qty", required: false, example: "1", help: "Quantity. Default 1." },
  { key: "price", required: true, example: "3990", help: "Price per item in rupees, numbers only." },
  { key: "shipping_fee", required: false, example: "200", help: "Delivery charge you collect from the buyer. Default 0." },
  { key: "payment", required: false, example: "COD", help: "COD or PREPAID. Default COD." },
  { key: "notes", required: false, example: "Call before delivery", help: "Saved on the order's activity." },
] as const;
