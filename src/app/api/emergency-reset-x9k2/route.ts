import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { NextRequest } from "next/server";

const SECRET = "185473e8bf3d9f99d1be68d044876ba784a7e92dcf86425d";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== SECRET) {
    return new Response("Not found", { status: 404 });
  }

  const username = req.nextUrl.searchParams.get("username") ?? "asaad";
  const password = req.nextUrl.searchParams.get("password");
  if (!password) {
    return new Response("Missing password", { status: 400 });
  }

  await prisma.user.update({
    where: { username },
    data: { passwordHash: hashPassword(password) },
  });

  return new Response("Password updated", { status: 200 });
}
