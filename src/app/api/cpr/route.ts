import { NextRequest, NextResponse } from "next/server";
import { inflateSync } from "zlib";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("cpr") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = extractPdfText(buffer);
    const rows = parseCPRText(text);
    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function extractPdfText(buffer: Buffer): string {
  const pdf = buffer.toString("binary");
  const texts: string[] = [];

  // Linear scan for all stream...endstream blocks (no XRef needed)
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;

  while ((m = streamRe.exec(pdf)) !== null) {
    let data = Buffer.from(m[1], "binary");

    // Try FlateDecode decompression
    try { data = inflateSync(data); } catch { /* not compressed */ }

    const content = data.toString("latin1");

    // Extract text from BT...ET blocks
    const btRe = /BT([\s\S]*?)ET/g;
    let bt: RegExpExecArray | null;
    while ((bt = btRe.exec(content)) !== null) {
      const block = bt[1];
      // (text) Tj  or  (text) Tj'
      const tjRe = /\(([^)]*)\)\s*Tj/g;
      let tj: RegExpExecArray | null;
      while ((tj = tjRe.exec(block)) !== null) texts.push(decodePdfString(tj[1]));
      // [(text) ...] TJ
      const arrRe = /\[([\s\S]*?)\]\s*TJ/g;
      let arr: RegExpExecArray | null;
      while ((arr = arrRe.exec(block)) !== null) {
        const inner = arr[1];
        const strRe = /\(([^)]*)\)/g;
        let s: RegExpExecArray | null;
        while ((s = strRe.exec(inner)) !== null) texts.push(decodePdfString(s[1]));
      }
    }
  }

  return texts.join("\n");
}

function decodePdfString(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\");
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
    if (!/^\d{14}$/.test(lines[i])) continue;
    const tracking = lines[i];

    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const sm = lines[j].match(statusRe);
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
