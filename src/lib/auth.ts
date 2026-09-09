import { randomBytes, scryptSync, createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { setCurrentActor } from "@/lib/auditContext";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add a strong random value to .env.local."
    );
  }
  return secret;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

// The session-version is baked into the signed token itself — there's no
// server-side session store, so this is how a forced logout (an admin
// kicking a specific user) works: bump the user's sessionVersion in the
// DB and every cookie issued before that no longer matches, everywhere,
// on the very next request that resolves the user.
export function createSessionToken(username: string, sessionVersion = 0) {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${username}:${sessionVersion}:${expires}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifySessionToken(token: string): { username: string; sessionVersion: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    // Tokens issued before sessionVersion existed have 3 parts instead of 4;
    // treat those as version 0 so existing logged-in sessions keep working.
    const [username, versionOrExpires, expiresOrSig, maybeSig] = parts;
    const hasVersion = parts.length === 4;
    const sessionVersion = hasVersion ? parseInt(versionOrExpires, 10) : 0;
    const expiresRaw = hasVersion ? expiresOrSig : versionOrExpires;
    const signature = hasVersion ? maybeSig : expiresOrSig;
    if (!username || !expiresRaw || !signature) return null;
    const payload = hasVersion ? `${username}:${sessionVersion}:${expiresRaw}` : `${username}:${expiresRaw}`;
    const expected = sign(payload);
    if (signature !== expected) return null;
    if (Date.now() > parseInt(expiresRaw, 10)) return null;
    return { username, sessionVersion };
  } catch {
    return null;
  }
}

export async function setSessionCookie(username: string, sessionVersion = 0) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(username, sessionVersion), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUsername(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token)?.username ?? null;
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified) return null;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { username: verified.username } });
  if (!user) return null;

  // An admin force-logged this user out after this cookie was issued.
  if (user.sessionVersion !== verified.sessionVersion) return null;

  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    // headers() is unavailable in some non-request contexts; audit
    // entries just won't have an IP for those calls.
  }
  setCurrentActor({ userId: user.id, userName: user.displayName ?? user.username, ip });
  return user;
}

// Used by the Employee Call mobile app instead of a username/password login —
// an admin generates one of these per employee from the Users settings page.
export function generateApiToken() {
  return randomBytes(24).toString("base64url");
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
