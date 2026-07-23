import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("cpr") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
    const { text } = await pdfParse(buffer);

    const rows = parseCPRText(text);
    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type CPRRow = {
  trackingNumber: string;
  status: "Delivered" | "Return";
  codAmount: number;
  shippingCharges: number;
  netAmount: number;
};

function parseCPRText(text: string): CPRRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: CPRRow[] = [];
  const statusRe = /^(Return|Delivered)(\d[\d,]*\.\d{2})(\d[\d,]*\.\d{2})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\d{14}$/.test(line)) continue;

    const tracking = line;

    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const sLine = lines[j];
      const sm = sLine.match(statusRe);
      if (!sm) continue;

      const isReturn = sm[1] === "Return";
      const shippingCharges = parseFloat(sm[2].replace(/,/g, ""));
      const codAmount = parseFloat(sm[3].replace(/,/g, ""));

      for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
        const aLine = lines[k];
        if (!/^\d/.test(aLine) || /\d{2}\/\d{2}\/\d{4}/.test(aLine)) continue;
        const parenMatch = aLine.match(/\(([\d,]+\.?\d*)\)/);
        let netAmount: number;
        if (parenMatch) {
          netAmount = -parseFloat(parenMatch[1].replace(/,/g, ""));
        } else {
          const nums = aLine.match(/\d[\d,]*\.\d{2}/g) ?? [];
          netAmount = nums.length >= 3 ? parseFloat(nums[2].replace(/,/g, "")) : 0;
        }
        if (!isNaN(netAmount)) {
          rows.push({ trackingNumber: tracking, status: isReturn ? "Return" : "Delivered", codAmount, shippingCharges, netAmount });
        }
        break;
      }
      break;
    }
  }

  return rows;
}
