import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { canView, parsePermissions } from "@/lib/permissions";
import { userLabel } from "@/lib/userLabel";

export const maxDuration = 60;

// Every reorder campaign with all its leads and call history, as one Excel
// workbook (Leads / Call History / Campaigns sheets; Leads first so the file
// opens on them) — for moving the data to another system. ?id=<n> limits it to one campaign.

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  NO_ANSWER: "No Answer",
  CALLBACK: "Callback",
  NOT_INTERESTED: "Not Interested",
  ORDER_PLACED: "Interested",
  INTERESTED_LATER: "Interested — Not Now",
  ORDER_RECEIVED: "Order Received",
};

const status = (s: string) => STATUS_LABELS[s] ?? s;
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const stamp = (d: Date | null | undefined) =>
  d ? d.toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "short" }) : "";

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canView(parsePermissions(me.permissions), "reorder", me.isAdmin)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const idParam = req.nextUrl.searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : null;
  if (idParam && !Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const userSelect = { select: { displayName: true, username: true, isAdmin: true } };
  const campaigns = await prisma.reorderCampaign.findMany({
    // Same visibility as the campaigns page: non-admins only see active ones.
    where: { ...(id ? { id } : {}), ...(me.isAdmin ? {} : { isActive: true }) },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: userSelect,
      leads: {
        orderBy: { id: "asc" },
        include: {
          calledBy: userSelect,
          callLogs: { orderBy: { calledAt: "asc" }, include: { calledBy: userSelect } },
        },
      },
    },
  });
  if (id && campaigns.length === 0) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const campaignRows: (string | number)[][] = [];
  const leadRows: (string | number)[][] = [];
  const callRows: (string | number)[][] = [];

  for (const c of campaigns) {
    const counts: Record<string, number> = {};
    for (const l of c.leads) counts[l.status] = (counts[l.status] ?? 0) + 1;
    campaignRows.push([
      c.id, c.name, c.isRetailFollowup ? "Retail Follow-up" : "Reorder", c.isActive ? "Yes" : "No",
      day(c.createdAt), c.createdBy ? userLabel(c.createdBy) : "", c.leads.length,
      ...Object.keys(STATUS_LABELS).map((k) => counts[k] ?? 0),
    ]);

    for (const l of c.leads) {
      leadRows.push([
        c.name, l.customerName, l.phone, l.email ?? "", l.address ?? "", l.city ?? "", l.prevItem ?? "",
        status(l.status), l.callNote ?? "", day(l.followUpDate), stamp(l.calledAt),
        l.calledBy ? userLabel(l.calledBy) : "", l.postexTrackingNumber ?? "", l.activeOnApp ? "Yes" : "No",
        l.callLogs.length, day(l.createdAt),
      ]);
      for (const log of l.callLogs) {
        callRows.push([c.name, l.customerName, l.phone, status(log.status), log.callNote ?? "", stamp(log.calledAt), userLabel(log.calledBy)]);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const sheet = (name: string, headers: string[], rows: (string | number)[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = widths.map((wch) => ({ wch }));
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  sheet(
    "Leads",
    ["Campaign", "Customer Name", "Phone", "Email", "Address", "City", "Previous Item", "Status", "Last Note", "Follow-up Date", "Last Called", "Called By", "PostEx Tracking", "Active On App", "Total Calls", "Added On"],
    leadRows,
    [26, 24, 14, 22, 36, 14, 30, 18, 36, 13, 17, 14, 16, 12, 10, 12],
  );
  sheet("Call History", ["Campaign", "Customer Name", "Phone", "Status", "Note", "Called At", "Called By"], callRows, [26, 24, 14, 18, 40, 17, 14]);
  sheet(
    "Campaigns",
    ["ID", "Campaign", "Type", "Active", "Created", "Created By", "Total Leads", ...Object.values(STATUS_LABELS)],
    campaignRows,
    [6, 30, 16, 8, 12, 16, 11, ...Object.keys(STATUS_LABELS).map(() => 12)],
  );

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const label = id ? campaigns[0].name.replace(/[^\w\- ]+/g, "").trim().slice(0, 50) || `campaign-${id}` : "reorder-campaigns";
  const filename = `${label}-${day(new Date())}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
