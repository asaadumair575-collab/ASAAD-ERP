import { prisma } from "@/lib/prisma";

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  const email = process.env.VAPID_EMAIL;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!email || !pub || !priv) return;

  const subs = await prisma.pushSubscription.findMany().catch(() => []);
  if (subs.length === 0) return;

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(email, pub, priv);

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
