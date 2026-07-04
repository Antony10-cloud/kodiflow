type DarajaTokenResponse = {
  access_token?: string;
  expires_in?: string;
  errorMessage?: string;
};

export function getDarajaBaseUrl() {
  return process.env.DARAJA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export async function getDarajaAccessToken() {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("Daraja consumer credentials are not configured.");
  }

  const authorization = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const response = await fetch(
    `${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${authorization}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = (await response.json()) as DarajaTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.errorMessage ?? "Safaricom rejected the Daraja credentials.");
  }

  return {
    accessToken: payload.access_token,
    expiresIn: Number(payload.expires_in ?? 0),
  };
}

export async function initiateStkPush(input: {
  phone: string;
  amount: number;
  accountReference: string;
}) {
  const shortcode = process.env.DARAJA_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;
  if (!shortcode || !passkey) throw new Error("STK Push credentials are not configured.");

  const timestamp = new Date(Date.now() + 3 * 60 * 60 * 1000)
    .toISOString().replace(/\D/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const { accessToken } = await getDarajaAccessToken();
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/mpesa/callback`;

  const response = await fetch(`${getDarajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: input.amount,
      PartyA: input.phone,
      PartyB: shortcode,
      PhoneNumber: input.phone,
      CallBackURL: callbackUrl,
      AccountReference: input.accountReference,
      TransactionDesc: "KodiFlow rent payment",
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.ResponseCode !== "0") {
    throw new Error(payload.errorMessage ?? payload.ResponseDescription ?? "STK Push was rejected.");
  }
  return payload;
}
