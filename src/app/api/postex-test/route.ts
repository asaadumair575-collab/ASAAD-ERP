import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.POSTEX_API_KEY;
  return NextResponse.json({
    keySet: !!key,
    keyLength: key?.length ?? 0,
    keyPreview: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : null,
  });
}
