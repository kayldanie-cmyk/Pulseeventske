/**
 * M-Pesa Daraja API integration helpers.
 * Handles OAuth authentication, STK Push (Lipa Na M-Pesa Online),
 * Kenyan phone number normalization, and simulated fallbacks for dev/demo.
 */

const DARAJA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY ?? "";
const DARAJA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET ?? "";
const DARAJA_PASSKEY = process.env.MPESA_PASSKEY ?? "";
const DARAJA_SHORTCODE = process.env.MPESA_SHORTCODE ?? "174379";
const DARAJA_ENV = process.env.MPESA_ENV ?? "sandbox";

const BASE_URL =
  DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export interface STKPushParams {
  phone: string;
  amount: number;
  accountRef: string;
  callbackUrl: string;
  description?: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/**
 * Normalizes Kenyan mobile numbers to international format: 2547XXXXXXXX or 2541XXXXXXXX
 * Handles 07..., 01..., +254..., 254..., and 7...
 */
export function normalizeKenyanPhone(input: string): {
  isValid: boolean;
  phone: string;
  error?: string;
} {
  const cleaned = input.replace(/[\s\-\(\)\+]/g, "");

  let normalized = cleaned;
  if (cleaned.startsWith("0")) {
    normalized = `254${cleaned.slice(1)}`;
  } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
    normalized = `254${cleaned}`;
  } else if (cleaned.startsWith("254")) {
    normalized = cleaned;
  }

  // Safaricom / Airtel Kenya format: 254 followed by 7xx or 1xx and 7 digits (total 12 digits)
  const isValid = /^254[17]\d{8}$/.test(normalized);

  if (!isValid) {
    return {
      isValid: false,
      phone: normalized,
      error: "Please enter a valid Kenyan phone number (e.g., 0712 345 678 or 0110 123 456).",
    };
  }

  return {
    isValid: true,
    phone: normalized,
  };
}

/**
 * In-memory simulated orders store for sandbox/demo fallback when Supabase or Daraja is unconfigured.
 */
interface InMemoryOrder {
  orderId: string;
  checkoutRequestId: string;
  phone: string;
  amount: number;
  eventId?: string;
  tierId?: string;
  status: "pending" | "paid" | "failed" | "expired";
  mpesaReceipt?: string;
  createdAt: number;
  tickets?: { code: string; hash: string }[];
}

declare global {
  var __pulseOrders: Map<string, InMemoryOrder> | undefined;
}

export const orderStore: Map<string, InMemoryOrder> =
  globalThis.__pulseOrders ?? (globalThis.__pulseOrders = new Map());

/**
 * Fetches OAuth bearer access token from Safaricom Daraja API
 */
export async function getAccessToken(): Promise<string> {
  if (!DARAJA_CONSUMER_KEY || !DARAJA_CONSUMER_SECRET) {
    throw new Error("M-Pesa Consumer Key or Secret not configured");
  }

  const auth = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to obtain Daraja access token: ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Initiates an M-Pesa STK Push (Lipa Na M-Pesa Online).
 * If Daraja credentials are fully set, sends live request.
 * Otherwise, generates a simulated sandbox response to allow full development & testing.
 */
export async function initiateSTKPush(
  params: STKPushParams
): Promise<STKPushResponse> {
  const norm = normalizeKenyanPhone(params.phone);
  if (!norm.isValid) {
    throw new Error(norm.error || "Invalid phone number");
  }

  // If live credentials are available, invoke Safaricom Daraja
  if (DARAJA_CONSUMER_KEY && DARAJA_CONSUMER_SECRET && DARAJA_PASSKEY) {
    const token = await getAccessToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:Z.]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
    ).toString("base64");

    const payload = {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amount),
      PartyA: norm.phone,
      PartyB: DARAJA_SHORTCODE,
      PhoneNumber: norm.phone,
      CallBackURL: params.callbackUrl,
      AccountReference: params.accountRef.slice(0, 12),
      TransactionDesc: (params.description || `Pulse ${params.accountRef}`).slice(0, 13),
    };

    const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.ResponseCode !== "0") {
      throw new Error(
        data.errorMessage || data.ResponseDescription || "M-Pesa STK Push rejected"
      );
    }

    return data as STKPushResponse;
  }

  // Fallback / Sandbox Demo Simulator:
  // Creates a realistic Daraja STK Push response
  const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(
    100000 + Math.random() * 900000
  )}`;
  const simulatedMerchantId = `MR-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  return {
    MerchantRequestID: simulatedMerchantId,
    CheckoutRequestID: simulatedCheckoutId,
    ResponseCode: "0",
    ResponseDescription: "Success. Request accepted for processing",
    CustomerMessage: `Success. Request accepted for processing. STK prompt sent to ${norm.phone}`,
  };
}
