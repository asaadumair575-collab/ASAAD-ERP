import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  const email = process.env.VAPID_EMAIL;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!email || !pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  vapidConfigured = true;
  return true;
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  if (!ensureVapid()) return;
  const subs = await prisma.pushSubscription.findMany();
  const message = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
      } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err) {
          const statusCode = (err as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
          }
        }
      }
    })
  );
}
