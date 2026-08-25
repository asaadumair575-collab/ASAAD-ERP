import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// FIREBASE_SERVICE_ACCOUNT holds the full service-account JSON (as a single
// env var string) from Firebase Console → Project Settings → Service
// accounts → Generate new private key.
function getFirebaseApp() {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set — can't send call-request pushes.");
  }
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

/** Pushes a "dial this number" command to one employee's Employee Call app. */
export async function sendCallRequestPush(params: {
  fcmToken: string;
  phoneNumber: string;
  customerName: string;
}) {
  const app = getFirebaseApp();
  await getMessaging(app).send({
    token: params.fcmToken,
    data: {
      type: "dial_lead",
      phoneNumber: params.phoneNumber,
      customerName: params.customerName,
    },
    android: { priority: "high" },
  });
}
