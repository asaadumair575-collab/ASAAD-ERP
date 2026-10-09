import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canView, canViewSub, parsePermissions } from "@/lib/permissions";
import { ZipWriter } from "@/lib/zip";

export const maxDuration = 60;

// Customers + every order they placed (date, items, quantity, amount) +
// every payment with its screenshot, as a ZIP:
//   <name>.xlsx                       Customers / Ledger / Orders / Items / Payments sheets
//   ledgers/<customer>.xlsx           one ledger per customer (debit, credit, running balance)
//   screenshots/<customer>/<file>     the payment screenshots, linked from Payments and the ledgers
//
// ?type=wholesale|retail   which customer book (default wholesale)
// ?id=<n>                  only that one customer

type ExportPayment = { id: number; date: Date; amount: number; method: string; note: string | null; hasScreenshot: boolean };
type ExportOrder = {
  id: number;
  ref: string;
  customerKey: string;
  date: Date;
  status: string;
  items: { description: string; quantity: number; rate: number }[];
  total: number;
  payments: ExportPayment[];
};
type ExportCustomer = { key: string; code: string; name: string; business: string; city: string; phone: string; address: string };

const SCREENSHOT_BATCH = 20;

function day(d: Date) {
  return d.toISOString().slice(0, 10);
}

function safe(s: string) {
  return s.replace(/[\\/:*?"<>|\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "unknown";
}

function decodeDataUrl(src: string): { bytes: Uint8Array; ext: string } | null {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(src);
  if (!m) return null;
  const mime = (m[1] || "image/jpeg").toLowerCase();
  const bytes = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : mime.includes("pdf") ? "pdf" : mime.includes("heic") ? "heic" : "jpg";
  return { bytes: new Uint8Array(bytes), ext };
}

async function loadWholesale(id: number | null) {
  const clients = await prisma.client.findMany({
    where: id ? { id } : undefined,
    orderBy: { name: "asc" },
    include: {
      orders: {
        where: { confirmed: true },
        orderBy: { date: "asc" },
        include: {
          items: true,
          payments: {
            orderBy: { date: "asc" },
            select: { id: true, date: true, amount: true, method: true, note: true },
          },
        },
      },
    },
  });
  // Separate cheap query so the base64 blobs aren't pulled in with everything else.
  const withShot = new Set(
    (
      await prisma.payment.findMany({
        where: { screenshot: { not: null }, order: { confirmed: true, ...(id ? { clientId: id } : {}) } },
        select: { id: true },
      })
    ).map((p) => p.id)
  );

  const customers: ExportCustomer[] = [];
  const orders: ExportOrder[] = [];
  for (const c of clients) {
    const key = `W${c.id}`;
    customers.push({ key, code: c.code, name: c.name, business: c.businessName ?? "", city: c.city ?? "", phone: c.phone ?? "", address: c.address ?? "" });
    for (const o of c.orders) {
      orders.push({
        id: o.id,
        ref: `INV-${String(o.id).padStart(4, "0")}`,
        customerKey: key,
        date: o.date,
        status: o.paymentStatus,
        items: o.items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate })),
        total: o.saleAmount,
        payments: o.payments.map((p) => ({ id: p.id, date: p.date, amount: p.amount, method: p.method, note: p.note, hasScreenshot: withShot.has(p.id) })),
      });
    }
  }

  const fetchShots = (ids: number[]) =>
    prisma.payment.findMany({ where: { id: { in: ids } }, select: { id: true, screenshot: true } });
  return { customers, orders, fetchShots };
}

async function loadRetail(id: number | null, ownerId: number | null) {
  const where = {
    ...(id ? { retailCustomerId: id } : {}),
    ...(ownerId ? { createdByUserId: ownerId } : {}),
  };
  const [rows, linked, shotRows] = await Promise.all([
    prisma.retailOrder.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        items: true,
        payments: { orderBy: { date: "asc" }, select: { id: true, date: true, amount: true, channel: true, note: true } },
      },
    }),
    prisma.retailCustomer.findMany({ where: id ? { id } : undefined, orderBy: { name: "asc" } }),
    prisma.retailPayment.findMany({ where: { screenshot: { not: null }, order: where }, select: { id: true } }),
  ]);
  const withShot = new Set(shotRows.map((p) => p.id));

  const customers = new Map<string, ExportCustomer>();
  for (const c of linked) {
    customers.set(`R${c.id}`, { key: `R${c.id}`, code: c.code, name: c.name, business: "", city: c.city ?? "", phone: c.phone ?? "", address: c.address ?? "" });
  }

  const orders: ExportOrder[] = [];
  for (const o of rows) {
    // Orders not linked to a saved customer are grouped by phone (or name).
    const key = o.retailCustomerId ? `R${o.retailCustomerId}` : `P${(o.phone ?? "").replace(/\D/g, "") || o.customerName.toLowerCase()}`;
    if (!customers.has(key)) {
      customers.set(key, { key, code: "", name: o.customerName, business: "", city: o.city ?? "", phone: o.phone ?? "", address: o.address ?? "" });
    }
    orders.push({
      id: o.id,
      ref: `R-${String(o.id).padStart(3, "0")}`,
      customerKey: key,
      date: o.date,
      status: o.status,
      items: o.items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate })),
      total: o.totalAmount,
      payments: o.payments.map((p) => ({ id: p.id, date: p.date, amount: p.amount, method: p.channel, note: p.note, hasScreenshot: withShot.has(p.id) })),
    });
  }

  const list = [...customers.values()].sort((a, b) => a.name.localeCompare(b.name));
  const fetchShots = (ids: number[]) =>
    prisma.retailPayment.findMany({ where: { id: { in: ids } }, select: { id: true, screenshot: true } });
  return { customers: list, orders, fetchShots };
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") === "retail" ? "retail" : "wholesale";
  const idParam = sp.get("id");
  const id = idParam ? parseInt(idParam, 10) : null;
  if (idParam && !Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const perms = parsePermissions(me.permissions);
  const allowed =
    type === "wholesale"
      ? canView(perms, "clients", me.isAdmin)
      : canView(perms, "retail", me.isAdmin) && canViewSub(perms, "retail_customers", me.isAdmin);
  if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const data = type === "wholesale" ? await loadWholesale(id) : await loadRetail(id, me.isAdmin ? null : me.id);
  if (id && data.customers.length === 0) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const customerByKey = new Map(data.customers.map((c) => [c.key, c]));
  const folderFor = (key: string) => {
    const c = customerByKey.get(key);
    return safe(c ? [c.code, c.name].filter(Boolean).join(" - ") : "unknown");
  };

  const shotPath = new Map<number, string>();
  const paymentRows: (string | number)[][] = [];
  const orderRows: (string | number)[][] = [];
  const itemRows: (string | number)[][] = [];
  const shotJobs: { paymentId: number; base: string }[] = [];

  for (const o of data.orders) {
    const c = customerByKey.get(o.customerKey);
    const qty = o.items.reduce((s, i) => s + i.quantity, 0);
    const paid = o.payments.reduce((s, p) => s + p.amount, 0);
    orderRows.push([
      day(o.date), o.ref, c?.code ?? "", c?.name ?? "", c?.city ?? "",
      o.items.map((i) => `${i.description} x${i.quantity}`).join(", "),
      qty, o.total, paid, Math.max(0, o.total - paid), o.status,
    ]);
    for (const i of o.items) {
      itemRows.push([day(o.date), o.ref, c?.code ?? "", c?.name ?? "", i.description, i.quantity, i.rate, Math.round(i.quantity * i.rate * 100) / 100]);
    }
    for (const p of o.payments) {
      if (p.hasScreenshot) {
        shotJobs.push({ paymentId: p.id, base: `screenshots/${folderFor(o.customerKey)}/${day(p.date)}_${o.ref}_payment-${p.id}` });
      }
      // Column 8 temporarily carries the payment id for the screenshot link; not written to the sheet.
      paymentRows.push([day(p.date), o.ref, c?.code ?? "", c?.name ?? "", p.amount, p.method, p.note ?? "", "", p.hasScreenshot ? p.id : ""]);
    }
  }

  const customerRows = data.customers.map((c) => {
    const os = data.orders.filter((o) => o.customerKey === c.key);
    const qty = os.reduce((s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0);
    const total = os.reduce((s, o) => s + o.total, 0);
    const paid = os.reduce((s, o) => s + o.payments.reduce((q, p) => q + p.amount, 0), 0);
    return [
      c.code, c.name, c.business, c.city, c.phone, c.address,
      os.length, qty, Math.round(total * 100) / 100, Math.round(paid * 100) / 100, Math.round((total - paid) * 100) / 100,
      os.length ? day(os[0].date) : "", os.length ? day(os[os.length - 1].date) : "",
    ];
  });

  // Same ledger as the customer page: each order is a debit on its date,
  // each payment a credit on its date, with a running balance.
  type LedgerEntry = { date: Date; description: string; debit: number; credit: number; paymentId: number | null; note: string };
  const ledgers = new Map<string, LedgerEntry[]>();
  for (const o of data.orders) {
    const list = ledgers.get(o.customerKey) ?? [];
    const items = o.items.map((i) => `${i.description} x${i.quantity}`).join(", ");
    list.push({ date: o.date, description: `Order ${o.ref}`, debit: o.total, credit: 0, paymentId: null, note: items });
    for (const p of o.payments) {
      list.push({ date: p.date, description: `Payment - ${o.ref} (${p.method.replace(/_/g, " ").toLowerCase()})`, debit: 0, credit: p.amount, paymentId: p.hasScreenshot ? p.id : null, note: p.note ?? "" });
    }
    ledgers.set(o.customerKey, list);
  }
  for (const list of ledgers.values()) list.sort((a, b) => a.date.getTime() - b.date.getTime());
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Rows for one customer's ledger; `linkPrefix` makes the screenshot path
  // relative to wherever the sheet lives inside the ZIP.
  const ledgerRowsFor = (key: string, linkPrefix: string) => {
    let balance = 0;
    return (ledgers.get(key) ?? []).map((e) => {
      balance += e.debit - e.credit;
      const shot = e.paymentId ? shotPath.get(e.paymentId) : undefined;
      return {
        row: [day(e.date), e.description, e.note, e.debit || "", e.credit || "", round2(balance), shot ? `${linkPrefix}${shot}` : ""] as (string | number)[],
        link: shot ? `${linkPrefix}${shot}` : null,
      };
    });
  };
  const LEDGER_HEADERS = ["Date", "Description", "Details", "Debit", "Credit", "Balance", "Screenshot"];
  const LEDGER_WIDTHS = [12, 30, 44, 12, 12, 12, 60];

  const addLinks = (ws: XLSX.WorkSheet, links: (string | null)[], firstRow: number, col: number) => {
    links.forEach((link, i) => {
      if (!link) return;
      ws[XLSX.utils.encode_cell({ r: firstRow + i, c: col })] = { t: "s", v: link, l: { Target: link } };
    });
  };

  const buildCustomerLedger = (c: ExportCustomer) => {
    const rows = ledgerRowsFor(c.key, "../");
    const debit = rows.reduce((s, r) => s + (Number(r.row[3]) || 0), 0);
    const credit = rows.reduce((s, r) => s + (Number(r.row[4]) || 0), 0);
    const info: (string | number)[][] = [
      [`Ledger — ${c.name}`],
      ["Code", c.code], ["Business", c.business], ["City", c.city], ["Phone", c.phone], ["Address", c.address],
      [],
      LEDGER_HEADERS,
    ];
    const ws = XLSX.utils.aoa_to_sheet([
      ...info,
      ...rows.map((r) => r.row),
      ["", "Total", "", round2(debit), round2(credit), round2(debit - credit), ""],
    ]);
    ws["!cols"] = LEDGER_WIDTHS.map((wch) => ({ wch }));
    addLinks(ws, rows.map((r) => r.link), info.length, 6);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer);
  };

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const sheet = (name: string, headers: string[], rows: (string | number)[][], widths: number[]) => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = widths.map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws, name);
      return ws;
    };
    sheet("Customers", ["Code", "Name", "Business", "City", "Phone", "Address", "Orders", "Total Qty (dzn)", "Total Sale", "Received", "Balance", "First Order", "Last Order"], customerRows, [10, 24, 20, 14, 14, 30, 8, 14, 12, 12, 12, 12, 12]);
    // All customers' ledgers on one sheet, each customer's block followed by a total line.
    const allLedger: (string | number)[][] = [];
    const allLinks: (string | null)[] = [];
    for (const c of data.customers) {
      const rows = ledgerRowsFor(c.key, "");
      if (rows.length === 0) continue;
      for (const r of rows) {
        allLedger.push([c.code, c.name, ...r.row]);
        allLinks.push(r.link);
      }
      const last = rows[rows.length - 1].row[5];
      allLedger.push(["", `${c.name} — closing balance`, "", "", "", "", "", last, ""], []);
      allLinks.push(null, null);
    }
    const ledgerWs = sheet("Ledger", ["Code", "Customer", ...LEDGER_HEADERS], allLedger, [10, 24, ...LEDGER_WIDTHS]);
    addLinks(ledgerWs, allLinks, 1, 8);
    sheet("Orders", ["Date", "Order #", "Code", "Customer", "City", "Items", "Qty (dzn)", "Amount", "Paid", "Balance", "Status"], orderRows, [12, 10, 10, 24, 14, 50, 10, 12, 12, 12, 10]);
    sheet("Items", ["Date", "Order #", "Code", "Customer", "Product", "Qty (dzn)", "Rate", "Amount"], itemRows, [12, 10, 10, 24, 30, 10, 10, 12]);
    const payWs = sheet("Payments", ["Date", "Order #", "Code", "Customer", "Amount", "Method", "Note", "Screenshot"], paymentRows.map((r) => r.slice(0, 8)), [12, 10, 10, 24, 12, 14, 24, 60]);

    // Clickable links to the screenshot files (relative, so they open once
    // the ZIP is extracted).
    paymentRows.forEach((row, idx) => {
      const paymentId = row[8] as number | "";
      if (paymentId === "") return;
      const path = shotPath.get(paymentId);
      const ref = XLSX.utils.encode_cell({ r: idx + 1, c: 7 });
      payWs[ref] = path ? { t: "s", v: path, l: { Target: path } } : { t: "s", v: "(unreadable screenshot)" };
    });
    return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer);
  };

  const label = id && data.customers[0] ? safe(data.customers[0].name) : `${type}-customers`;
  const filename = `${label}-sales-${day(new Date())}.zip`;

  // Screenshots are streamed out a batch at a time so their base64 blobs are
  // never all in memory together; the workbook goes last because its links
  // need each file's real extension, known only after decoding.
  let next = 0;
  let zip: ZipWriter;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      zip = new ZipWriter((chunk) => controller.enqueue(chunk));
    },
    async pull(controller) {
      try {
        if (next < shotJobs.length) {
          const batch = shotJobs.slice(next, next + SCREENSHOT_BATCH);
          next += SCREENSHOT_BATCH;
          const rows = await data.fetchShots(batch.map((b) => b.paymentId));
          for (const r of rows) {
            if (!r.screenshot) continue;
            const decoded = decodeDataUrl(r.screenshot);
            if (!decoded) continue;
            const path = `${batch.find((b) => b.paymentId === r.id)!.base}.${decoded.ext}`;
            shotPath.set(r.id, path);
            zip.addFile(path, decoded.bytes);
          }
          return;
        }
        zip.addFile(`${label}-sales.xlsx`, buildWorkbook());
        const used = new Set<string>();
        for (const c of data.customers) {
          if (!ledgers.has(c.key)) continue;
          let file = folderFor(c.key);
          for (let n = 2; used.has(file.toLowerCase()); n++) file = `${folderFor(c.key)} (${n})`;
          used.add(file.toLowerCase());
          zip.addFile(`ledgers/${file}.xlsx`, buildCustomerLedger(c));
        }
        zip.finish();
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
