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
    const texts = extractPdfTokens(buffer);
    const rows = parseCPRText(texts);
    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function extractPdfTokens(buffer: Buffer): string[] {
  const pdf = buffer.toString("binary");
  const tokens: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;

  while ((m = streamRe.exec(pdf)) !== null) {
    let data = Buffer.from(m[1], "binary");
    try { data = inflateSync(data); } catch { /* not compressed */ }

    const content = data.toString("latin1");
    const btRe = /BT([\s\S]*?)ET/g;
    let bt: RegExpExecArray | null;
    while ((bt = btRe.exec(content)) !== null) {
      const block = bt[1];
      const tjRe = /\(([^)]*)\)\s*Tj/g;
      let tj: RegExpExecArray | null;
      while ((tj = tjRe.exec(block)) !== null) {
        const t = decodePdfString(tj[1]).trim();
        if (t) tokens.push(t);
      }
      const arrRe = /\[([\s\S]*?)\]\s*TJ/g;
      let arr: RegExpExecArray | null;
      while ((arr = arrRe.exec(block)) !== null) {
        const strRe = /\(([^)]*)\)/g;
        let s: RegExpExecArray | null;
        while ((s = strRe.exec(arr[1])) !== null) {
          const t = decodePdfString(s[1]).trim();
          if (t) tokens.push(t);
        }
      }
    }
  }

  return tokens;
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

function parseCPRText(texts: string[]): CPRRow[] {
  const rows: CPRRow[] = [];
  const isDecimal = (s: string) => /^[\d,]+\.\d+$/.test(s);
  const parseNum = (s: string) => parseFloat(s.replace(/,/g, ""));

  for (let i = 0; i < texts.length; i++) {
    if (!/^\d{14}$/.test(texts[i])) continue;
    const tracking = texts[i];

    // Find status token within next 6 tokens
    let statusIdx = -1;
    let status: "Return" | "Delivered" | null = null;
    for (let j = i + 1; j < Math.min(i + 7, texts.length); j++) {
      if (texts[j] === "Return" || texts[j] === "Delivered") {
        status = texts[j] as "Return" | "Delivered";
        statusIdx = j;
        break;
      }
    }
    if (!status || statusIdx < 0) continue;

    // Collect decimal numbers after status until SR number (integer, no decimal)
    const nums: number[] = [];
    for (let j = statusIdx + 1; j < Math.min(statusIdx + 8, texts.length); j++) {
      if (isDecimal(texts[j])) nums.push(parseNum(texts[j]));
      else break;
    }

    // nums: [shipping, cod, upfront(0), reserve/0, net(delivered only)]
    const shippingCharges = nums[0] ?? 0;
    const codAmount = nums[1] ?? 0;
    const netAmount = status === "Delivered" ? (nums[nums.length - 1] ?? 0) : -shippingCharges;

    rows.push({ trackingNumber: tracking, status, codAmount, shippingCharges, netAmount });
    i = statusIdx;
  }

  return rows;
}
