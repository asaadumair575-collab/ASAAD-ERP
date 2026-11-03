import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// APP_SECRET signs sessions and encrypts stored API keys. When it isn't set
// (e.g. a fresh Vercel project), a key is derived from DATABASE_URL — itself a
// server-only secret — so the app still works securely out of the box.
// Note: adding APP_SECRET later signs everyone out and means saved Shopify /
// courier connections must be reconnected.
function secret() {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 16) return s;
  const db = process.env.DATABASE_URL;
  if (!db) throw new Error("APP_SECRET (or DATABASE_URL) is not set.");
  return createHash("sha256").update(`store-ops:app-secret:${db}`).digest("hex");
}

// ── Passwords ─────────────────────────────────────────────────────────────

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(password, salt, 64);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function randomPassword(length = 10) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// ── Encryption for stored API credentials (AES-256-GCM) ───────────────────

const key = () => createHash("sha256").update(`enc:${secret()}`).digest();

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(token: string) {
  const [iv, tag, data] = token.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

// ── Signing (session cookies, OAuth state) ─────────────────────────────────

export function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
