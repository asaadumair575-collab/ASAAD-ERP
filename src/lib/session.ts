import { sign, safeEqual } from "./crypto";

// Signed cookie sessions. The payload is not secret, only tamper-proof; the
// DB is still checked on every request (see auth.ts) for expiry, suspension
// and forced logout.

export const USER_COOKIE = "sd_user";
export const ADMIN_COOKIE = "sd_admin";
export const SESSION_DAYS = 30;

export type SessionPayload = { id: number; v: number; exp: number };

export function createToken(payload: Omit<SessionPayload, "exp">) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + SESSION_DAYS * 86400000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}
