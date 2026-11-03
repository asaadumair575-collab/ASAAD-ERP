import type { Courier, ShipmentStatus } from "@/generated/prisma/client";

// One adapter per courier: book a parcel, read tracking, test credentials.
// Credentials are stored encrypted per store (CourierAccount.credentials).

export type BookInput = {
  orderRef: string;
  customerName: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  codAmount: number;
  pieces: number;
  description: string;
  weightKg: number;
};
export type BookResult = { trackingNumber: string; slipUrl?: string; charge?: number };
export type TrackResult = { status: ShipmentStatus; courierStatus: string; charge?: number };

type Field = { key: string; label: string; secret?: boolean; placeholder?: string; optional?: boolean };

export const COURIER_INFO: Record<Courier, { name: string; fields: Field[]; trackUrl: (cn: string) => string; note?: string }> = {
  POSTEX: {
    name: "PostEx",
    fields: [
      { key: "token", label: "API token", secret: true, placeholder: "From PostEx merchant portal → API" },
      { key: "pickupAddressCode", label: "Pickup address code", placeholder: "e.g. 001" },
    ],
    trackUrl: (cn) => `https://postex.pk/tracking?cn=${encodeURIComponent(cn)}`,
  },
  LEOPARDS: {
    name: "Leopards",
    fields: [
      { key: "apiKey", label: "API key", secret: true },
      { key: "apiPassword", label: "API password", secret: true },
    ],
    trackUrl: (cn) => `https://www.leopardscourier.com/leopards-tracking?cn=${encodeURIComponent(cn)}`,
  },
  TCS: {
    name: "TCS",
    fields: [
      { key: "clientId", label: "API client ID (X-IBM-Client-Id)", secret: true },
      { key: "username", label: "Username" },
      { key: "password", label: "Password", secret: true },
      { key: "costCenterCode", label: "Cost center code" },
      { key: "originCity", label: "Pickup city", placeholder: "e.g. LAHORE" },
      { key: "baseUrl", label: "API base URL", optional: true, placeholder: "https://api.tcscourier.com/production" },
    ],
    trackUrl: (cn) => `https://www.tcsexpress.com/track/${encodeURIComponent(cn)}`,
    note: "Uses TCS's COD booking API. Ask TCS for API access for your account.",
  },
  DEMO: {
    name: "Demo Courier",
    fields: [],
    trackUrl: () => "#",
    note: "Simulated courier for demo accounts — books instantly and moves parcels along over a few days.",
  },
};

export type Creds = Record<string, string>;

// ── Status mapping ────────────────────────────────────────────────────────

export function mapStatus(text: string): ShipmentStatus {
  const s = text.toLowerCase();
  if (/return|rto|refused/.test(s)) return "RETURNED";
  if (/out for delivery|out-for-delivery|ofd/.test(s)) return "OUT_FOR_DELIVERY";
  if (/deliver/.test(s) && !/undeliver|attempt/.test(s)) return "DELIVERED";
  if (/cancel/.test(s)) return "CANCELLED";
  if (/transit|picked|pick up|arriv|dispatch|en.?route|received at|hub|shipped|attempt|undeliver/.test(s)) return "IN_TRANSIT";
  return "BOOKED";
}

async function json(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response (${res.status}): ${text.slice(0, 200)}`);
  }
}

// ── PostEx ────────────────────────────────────────────────────────────────

const POSTEX = "https://api.postex.pk/services/integration/api";

const postex = {
  async book(c: Creds, i: BookInput): Promise<BookResult> {
    const res = await fetch(`${POSTEX}/order/v3/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: c.token },
      body: JSON.stringify({
        orderType: "Normal",
        pickupAddressCode: c.pickupAddressCode || "001",
        orderRefNumber: i.orderRef,
        invoiceNumber: i.orderRef,
        cityName: i.city,
        customerName: i.customerName,
        customerPhone: i.phone,
        deliveryAddress: i.address,
        invoicePayment: Math.round(i.codAmount),
        items: i.pieces,
        orderDetail: i.description,
        transactionNotes: i.orderRef,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await json(res);
    if (!res.ok || data?.statusCode === false || data?.status === false) throw new Error(data?.statusMessage ?? data?.message ?? `PostEx error ${res.status}`);
    const cn = data?.dist?.trackingNumber ?? data?.trackingNumber ?? data?.data?.trackingNumber;
    if (!cn) throw new Error(data?.statusMessage ?? "PostEx did not return a tracking number");
    return { trackingNumber: String(cn) };
  },
  async track(c: Creds, cn: string): Promise<TrackResult | null> {
    const res = await fetch(`${POSTEX}/order/v3/get-track-order/${encodeURIComponent(cn)}`, { headers: { token: c.token }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await json(res);
    const d = data?.dist ?? data;
    const status = String(d?.transactionStatus ?? d?.orderStatus ?? d?.status ?? "");
    if (!status) return null;
    const charge = parseFloat(String(d?.shippingCharges ?? d?.deliveryCharges ?? "")) || undefined;
    return { status: mapStatus(status), courierStatus: status, charge };
  },
  async test(c: Creds) {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${POSTEX}/order/v1/get-order-list?fromDate=${today}&toDate=${today}`, { headers: { token: c.token }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (res.status === 401 || res.status === 403) throw new Error("PostEx rejected the API token.");
    if (!res.ok) throw new Error(`PostEx returned ${res.status}`);
  },
};

// ── Leopards ──────────────────────────────────────────────────────────────

const LEOPARDS = "https://merchantapi.leopardscourier.com/api";
const leopardsCities = new Map<string, { at: number; cities: { id: number; name: string }[] }>();

async function leopardsCityId(c: Creds, city: string) {
  let entry = leopardsCities.get(c.apiKey);
  if (!entry || Date.now() - entry.at > 3600_000) {
    const q = new URLSearchParams({ api_key: c.apiKey, api_password: c.apiPassword });
    const data = await json(await fetch(`${LEOPARDS}/getAllCities/format/json/?${q}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }));
    if (!data?.status) throw new Error(data?.error ?? "Leopards: could not load city list");
    entry = { at: Date.now(), cities: (data.city_list ?? []).map((x: { id: number; name: string }) => ({ id: Number(x.id), name: String(x.name) })) };
    leopardsCities.set(c.apiKey, entry);
  }
  const want = city.trim().toLowerCase();
  const hit = entry.cities.find((x) => x.name.toLowerCase() === want) ?? entry.cities.find((x) => x.name.toLowerCase().startsWith(want));
  if (!hit) throw new Error(`Leopards does not recognise the city "${city}". Fix the city on the order and try again.`);
  return hit.id;
}

const leopards = {
  async book(c: Creds, i: BookInput): Promise<BookResult> {
    const body = new URLSearchParams({
      api_key: c.apiKey,
      api_password: c.apiPassword,
      booked_packet_weight: String(Math.max(1, Math.round(i.weightKg * 1000))),
      booked_packet_no_piece: String(i.pieces),
      booked_packet_collect_amount: String(Math.round(i.codAmount)),
      booked_packet_order_id: i.orderRef,
      origin_city: "self",
      destination_city: String(await leopardsCityId(c, i.city)),
      shipment_name_eng: "self",
      shipment_email: "self",
      shipment_phone: "self",
      shipment_address: "self",
      consignment_name_eng: i.customerName,
      consignment_email: i.email || "",
      consignment_phone: i.phone,
      consignment_address: i.address,
      special_instructions: i.description.slice(0, 200),
    });
    const data = await json(await fetch(`${LEOPARDS}/bookPacket/format/json/`, { method: "POST", body, signal: AbortSignal.timeout(20000) }));
    if (!data?.status || !data?.track_number) throw new Error(data?.error ?? "Leopards booking failed");
    return { trackingNumber: String(data.track_number), slipUrl: data.slip_link ? String(data.slip_link) : undefined };
  },
  async track(c: Creds, cn: string): Promise<TrackResult | null> {
    const q = new URLSearchParams({ api_key: c.apiKey, api_password: c.apiPassword, track_numbers: cn });
    const data = await json(await fetch(`${LEOPARDS}/trackBookedPacket/format/json/?${q}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }));
    const p = data?.packet_list?.[0];
    const status = String(p?.booked_packet_status ?? "");
    if (!status) return null;
    return { status: mapStatus(status), courierStatus: status };
  },
  async test(c: Creds) {
    const q = new URLSearchParams({ api_key: c.apiKey, api_password: c.apiPassword });
    const data = await json(await fetch(`${LEOPARDS}/getAllCities/format/json/?${q}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }));
    if (!data?.status) throw new Error(data?.error ?? "Leopards rejected the API key/password.");
  },
};

// ── TCS ───────────────────────────────────────────────────────────────────

const tcsBase = (c: Creds) => (c.baseUrl || "https://api.tcscourier.com/production").replace(/\/+$/, "");

const tcs = {
  async book(c: Creds, i: BookInput): Promise<BookResult> {
    const res = await fetch(`${tcsBase(c)}/v1/cod/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-IBM-Client-Id": c.clientId },
      body: JSON.stringify({
        userName: c.username,
        password: c.password,
        costCenterCode: c.costCenterCode,
        consigneeName: i.customerName,
        consigneeAddress: i.address,
        consigneeMobNo: i.phone,
        consigneeEmail: i.email || "",
        originCityName: c.originCity,
        destinationCityName: i.city,
        weight: i.weightKg,
        pieces: i.pieces,
        codAmount: String(Math.round(i.codAmount)),
        customerReferenceNo: i.orderRef,
        services: "O",
        productDetails: i.description.slice(0, 200),
        fragile: "No",
        remarks: i.orderRef,
        insuranceValue: 0,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await json(res);
    const result = String(data?.bookingReply?.result ?? "");
    const cn = result.match(/\d{6,}/)?.[0];
    if (!res.ok || !cn) throw new Error(data?.returnStatus?.message ?? (result || `TCS error ${res.status}`));
    return { trackingNumber: cn };
  },
  async track(c: Creds, cn: string): Promise<TrackResult | null> {
    const res = await fetch(`${tcsBase(c)}/track/v1/shipments/detail?consignmentNo=${encodeURIComponent(cn)}`, {
      headers: { "X-IBM-Client-Id": c.clientId },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await json(res);
    const info = data?.TrackDetailReply ?? data;
    const list = (info?.DeliveryInfo ?? info?.Checkpoints ?? []) as { status?: string; Status?: string }[];
    const status = String(list[0]?.status ?? list[0]?.Status ?? info?.TrackInfo?.[0]?.status ?? "");
    if (!status) return null;
    return { status: mapStatus(status), courierStatus: status };
  },
  async test(c: Creds) {
    if (!c.clientId || !c.username || !c.password) throw new Error("Client ID, username and password are required.");
  },
};

// ── Demo courier (simulated) ──────────────────────────────────────────────

const demo = {
  async book(_c: Creds, i: BookInput): Promise<BookResult> {
    void i;
    return { trackingNumber: `DM${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`, charge: 250 };
  },
  // Parcels move along with time since booking; ~10% come back.
  simulate(bookedAt: Date, trackingNumber: string): TrackResult {
    const hours = (Date.now() - bookedAt.getTime()) / 3600000;
    const returns = Number(trackingNumber.slice(-1)) === 7;
    if (hours < 12) return { status: "BOOKED", courierStatus: "Booked" };
    if (hours < 40) return { status: "IN_TRANSIT", courierStatus: "In transit" };
    if (hours < 60) return { status: "OUT_FOR_DELIVERY", courierStatus: "Out for delivery" };
    return returns ? { status: "RETURNED", courierStatus: "Returned to shipper" } : { status: "DELIVERED", courierStatus: "Delivered" };
  },
  async test() {},
};

export const adapters = { POSTEX: postex, LEOPARDS: leopards, TCS: tcs, DEMO: demo };

export function courierName(c: Courier) {
  return COURIER_INFO[c].name;
}
