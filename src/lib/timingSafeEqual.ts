import { timingSafeEqual } from "crypto";

// Constant-time string comparison — avoids leaking key length/content via
// response-time differences on shared-secret checks (X-Api-Key, etc).
export function timingSafeEqualStr(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
