/**
 * M-Pesa Daraja API integration helpers.
 * Fill in credentials and endpoints before going live.
 */

const DARAJA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY ?? "";
const DARAJA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET ?? "";
const DARAJA_PASSKEY = process.env.MPESA_PASSKEY ?? "";
const DARAJA_SHORTCODE = process.env.MPESA_SHORTCODE ?? "174379";
const DARAJA_ENV = process.env.MPESA_ENV ?? "sandbox";

const BASE =
  DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`
  ).toString("base64");
  const res = await fetch(
    `${BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  const data = await res.json();
  return data.access_token;
}

export async function initiateSTKPush(params: {
  phone: string;
  amount: number;
  accountRef: string;
  callbackUrl: string;
}) {
  const token = await getAccessToken();
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:Z.]/g, "")
    .slice(0, 14);
  const password = Buffer.from(
    `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
  ).toString("base64");

  const body = {
    BusinessShortCode: DARAJA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: params.amount,
    PartyA: params.phone,
    PartyB: DARAJA_SHORTCODE,
    PhoneNumber: params.phone,
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountRef,
    TransactionDesc: `Ticket ${params.accountRef}`,
  };

  const res = await fetch(
    `${BASE}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}
