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
