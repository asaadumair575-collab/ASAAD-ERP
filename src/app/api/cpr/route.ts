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
    const token = texts[i];
    if (token !== "Delivered" && token !== "Return" && token !== "Returned") continue;
    const status: "Delivered" | "Return" = token === "Delivered" ? "Delivered" : "Return";

    // Collect decimal numbers immediately after status (stop at first non-decimal)
    const nums: number[] = [];
    let j = i + 1;
    for (; j < Math.min(i + 12, texts.length); j++) {
      if (isDecimal(texts[j])) nums.push(parseNum(texts[j]));
      else break;
    }

    // Must have at least 2 numbers (shipping + cod) to be a real order row
    if (nums.length < 2) continue;

    // Find tracking number (14 digits) within next 25 tokens
    let trackingNumber: string | null = null;
    for (let k = j; k < Math.min(j + 25, texts.length); k++) {
      if (/^\d{14}$/.test(texts[k])) {
        trackingNumber = texts[k];
        i = k;
        break;
      }
    }
    if (!trackingNumber) continue;

    // nums: [shipping, cod, upfront(0), reserve(0), net]
    const shippingCharges = nums[0] ?? 0;
    const codAmount = nums[1] ?? 0;
    const netAmount = nums[nums.length - 1] ?? 0;

    rows.push({ trackingNumber, status, codAmount, shippingCharges, netAmount });
  }

  return rows;
}
